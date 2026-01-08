# complaints/views.py
from django.db import models
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView

from rest_framework import generics
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated

from .permissions import IsStaffOrReadOnly
from .models import Complaint, Department
from .serializers import ComplaintSerializer, DepartmentSerializer
from .ai_classifier import classify_department_id
from .ai_summary import summarize_complaint
from .utils import make_fingerprint, fp_similarity
from django.utils import timezone
from datetime import timedelta
from users.models import Profile

SIM_THRESHOLD = 0.7


def get_complaints_queryset_for_user(user):
    """
    يرجّع queryset الشكاوي المسموحة لهذا المستخدم حسب:
    - role (citizen / staff / manager)
    - profile.view_scope
    - profile.allowed_departments
    """
    qs = Complaint.objects.all()

    if not user.is_authenticated:
        return Complaint.objects.none()

    try:
        profile = user.profile
    except Profile.DoesNotExist:
        profile = None

    role = (
        (profile.role if profile and profile.role else None)
        or ("staff" if user.is_staff else "citizen")
    )

    # المواطن → فقط شكاويه
    if role == "citizen" and not user.is_staff:
        return qs.filter(user=user)

    # موظف / مدير
    if profile:
        scope = getattr(profile, "view_scope", "all") or "all"

        if scope == "unassigned":
            # موظف خاص فقط بالشكاوي التي لم تُعيّن لوحدة
            return qs.filter(department__isnull=True)

        if scope == "assigned":
            # موظف يرى فقط الشكاوي التابعة لوحدات محددة
            dep_ids = list(
                profile.allowed_departments.values_list("id", flat=True)
            )
            if dep_ids:
                return qs.filter(department_id__in=dep_ids)
            # ما في أي وحدة معيّنة → ما يشوف شي
            return Complaint.objects.none()

    # افتراضي: يشوف كل الشكاوي (مثلاً مدير عام بدون تقييد)
    return qs


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.all().order_by("name_tr")
    serializer_class = DepartmentSerializer
    permission_classes = [IsStaffOrReadOnly]


class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.all().order_by("name_tr")
    serializer_class = DepartmentSerializer
    permission_classes = [IsStaffOrReadOnly]


@method_decorator(ensure_csrf_cookie, name="dispatch")
class ComplaintListCreateView(generics.ListCreateAPIView):
    """
    - GET: يرجّع الشكاوي حسب صلاحيات المستخدم (get_complaints_queryset_for_user)
    - POST: ينشئ شكوى جديدة مع منطق الـ AI والـ duplicate detection
    """
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "department"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        # ⚠️ هنا التغيير المهم: نستخدم الدالة الجديدة بدلاً من if user.is_staff ...
        return get_complaints_queryset_for_user(user).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        raw_text = serializer.validated_data.get("text", "") or ""

        # بصمة للنص لتمييز الـ duplicate
        fp = make_fingerprint(raw_text)

        obj = serializer.save(
            user=user,
            fingerprint=fp or None,
        )

        best_existing = None
        best_sim = 0.0

        if fp:
            recent_since = timezone.now() - timedelta(days=2)

            existing_qs = (
                Complaint.objects
                .exclude(pk=obj.pk)
                .exclude(fingerprint__isnull=True)
                .exclude(fingerprint__exact="")
                .filter(
                    models.Q(department__isnull=False)
                    | models.Q(summary__isnull=False)
                    | models.Q(confidence__isnull=False),
                    created_at__gte=recent_since,
                )
            )

            for other in existing_qs:
                sim = fp_similarity(fp, other.fingerprint or "")
                if sim > best_sim:
                    best_sim = sim
                    best_existing = other

        # معالجة الـ duplicate
        if best_existing and best_sim >= SIM_THRESHOLD:
            base = best_existing.base_complaint or best_existing

            if base.department_id or base.summary or base.confidence is not None:
                existing_dup_count = Complaint.objects.filter(
                    base_complaint=base
                ).count()

                obj.base_complaint = base
                obj.duplicate_index = existing_dup_count + 1
                obj.used_ai = False
                obj.department = base.department
                obj.summary = base.summary
                obj.confidence = base.confidence

                obj.save()
                return

        # لو ما كان duplicate نطبق الـ AI
        used_ai = False

        if obj.text and not obj.summary:
            summary = summarize_complaint(obj.text)
            if summary:
                obj.summary = summary
                used_ai = True

        if obj.text and obj.department_id is None:
            dept_id, score = classify_department_id(obj.text, min_score=0.50)
            if dept_id:
                obj.department_id = dept_id
                used_ai = True
            obj.confidence = score

        obj.base_complaint = None
        obj.duplicate_index = 0
        obj.used_ai = used_ai
        obj.save()


class ComplaintDetailView(generics.RetrieveUpdateAPIView):
    """
    - GET: يرجّع شكوى واحدة حسب صلاحيات المستخدم (نفس منطق القائمة)
    - PATCH: فقط staff يعدّل (مثل قبل)
    """
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # ⚠️ نفس الفكرة: نقيّد الوصول حسب view_scope و allowed_departments
        return get_complaints_queryset_for_user(user)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        data = serializer.validated_data

        if not user.is_staff:
            # غير الموظفين ما يعدّلوا
            return

        old_status = instance.status
        new_status = data.get("status", old_status)

        if "text" in data:
            instance.text = data["text"]

        if "status" in data:
            instance.status = new_status
            now = timezone.now()

            if new_status == "in_review":
                instance.in_review_at = now
            if new_status == "closed":
                instance.closed_at = now

        if "summary" in data:
            instance.summary = data["summary"]

        if "department" in data:
            instance.department = data["department"]

        instance.save()


class ComplaintFormPage(TemplateView):
    template_name = "complaints/submit.html"
