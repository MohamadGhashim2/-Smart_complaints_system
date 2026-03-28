# complaints/views.py
from django.db import transaction
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView

from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter
from rest_framework.throttling import ScopedRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated

from .permissions import IsStaffOrReadOnly
from .models import Complaint, Department
from .serializers import ComplaintSerializer, DepartmentSerializer
from .services import create_complaint_with_ai
from users.audit import write_audit_log
from users.models import Profile

def get_complaints_queryset_for_user(user):
    """
    يرجّع queryset الشكاوي المسموحة لهذا المستخدم حسب:
    - role (citizen / staff / manager)
    - profile.view_scope
    - profile.allowed_departments
    """
    qs = Complaint.objects.select_related("user", "department", "base_complaint")

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
    throttle_classes = [ScopedRateThrottle]

    def get_queryset(self):
        user = self.request.user
        # ⚠️ هنا التغيير المهم: نستخدم الدالة الجديدة بدلاً من if user.is_staff ...
        return get_complaints_queryset_for_user(user).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        create_complaint_with_ai(serializer, user)

    def get_throttles(self):
        if self.request.method == "POST":
            self.throttle_scope = "complaint_create"
        return super().get_throttles()


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
        with transaction.atomic():
            user = self.request.user
            instance = self.get_object()
            data = serializer.validated_data

            if not user.is_staff:
                raise PermissionDenied("Only staff users can update complaints.")

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
            write_audit_log(
                actor=user,
                action="complaint_updated",
                target_type="complaint",
                target_id=instance.id,
                metadata={
                    "status": instance.status,
                    "department_id": instance.department_id,
                },
            )


class ComplaintFormPage(TemplateView):
    template_name = "complaints/submit.html"