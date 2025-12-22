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

SIM_THRESHOLD = 0.7  


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
    queryset = Complaint.objects.all().order_by("-created_at")
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "department"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        qs = Complaint.objects.all().order_by("-created_at")
        user = self.request.user

        if user.is_authenticated and user.is_staff:
            return qs

        if user.is_authenticated:
            return qs.filter(user=user)

        return qs.none()

    def perform_create(self, serializer):
        """
        إنشاء شكوى جديدة مع:
        - حساب fingerprint
        - البحث عن شكوى مشابهة
        - لو مكررة: ننسخ القسم + الملخص + الثقة بدون استعمال AI
        - لو جديدة: نستخدم AI للتلخيص والتصنيف
        """
        user = self.request.user if self.request.user.is_authenticated else None
        raw_text = serializer.validated_data.get("text", "") or ""

        fp = make_fingerprint(raw_text)

        obj = serializer.save(
            user=user,
            fingerprint=fp or None,
        )

        best_existing = None
        best_sim = 0.0

        if fp:
            existing_qs = (
                Complaint.objects
                .exclude(pk=obj.pk)
                .exclude(fingerprint__isnull=True)
                .exclude(fingerprint__exact="")
                .filter(
                    models.Q(department__isnull=False)
                    | models.Q(summary__isnull=False)
                    | models.Q(confidence__isnull=False)
                )
            )

            for other in existing_qs:
                sim = fp_similarity(fp, other.fingerprint or "")
                print(f"[SIM] new={obj.id} vs existing={other.id} -> {sim:.3f}")
                if sim > best_sim:
                    best_sim = sim
                    best_existing = other

            print(
                f"[SIM] BEST for new={obj.id}: "
                f"best_existing={getattr(best_existing, 'id', None)}, best_sim={best_sim:.3f}"
            )

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
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Complaint.objects.all()
        user = self.request.user

        if user.is_authenticated and user.is_staff:
            return qs

        if user.is_authenticated:
            return qs.filter(user=user)

        return qs.none()

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        data = serializer.validated_data

        if not user.is_staff:
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
