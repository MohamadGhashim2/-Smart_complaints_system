# complaints/views.py
from rest_framework import generics
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from django.db import models
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView

from .permissions import IsStaffOrReadOnly
from .models import Complaint, Department
from .serializers import ComplaintSerializer, DepartmentSerializer

from .ai_classifier import classify_department_id
from .ai_summary import summarize_complaint
from .utils import make_fingerprint, fp_similarity

from users.models import SystemSettings, Profile
from datetime import timedelta
from django.utils import timezone


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

        # staff/admin يشوف الكل
        if user.is_authenticated and user.is_staff:
            return qs

        # citizen يشوف شكاويه فقط
        if user.is_authenticated:
            return qs.filter(user=user)

        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        raw_text = serializer.validated_data.get("text", "") or ""
        department = serializer.validated_data.get("department")

        settings = SystemSettings.get_solo()
        use_ai_summary = settings.use_ai_summary
        use_ai_routing = settings.use_ai_routing
        use_duplicate_detection = settings.use_duplicate_detection
        sim_threshold = settings.similarity_threshold
        ai_min_confidence = settings.ai_min_confidence

        # 0) citizen blocked / spam checks
        profile = None
        if user:
            try:
                profile = user.profile
            except Profile.DoesNotExist:
                profile = None

            if profile and profile.is_blocked:
                raise ValidationError(
                    {"detail": "You are blocked from submitting complaints."}
                )

            now = timezone.now()

            # daily limit
            if settings.spam_max_per_day:
                day_ago = now - timedelta(days=1)
                per_day = Complaint.objects.filter(
                    user=user, created_at__gte=day_ago
                ).count()
                if per_day >= settings.spam_max_per_day:
                    if profile:
                        profile.is_spammer = True
                        profile.save(update_fields=["is_spammer"])
                    raise ValidationError(
                        {"detail": "Daily complaint limit exceeded."}
                    )

            # hourly limit
            if settings.spam_max_per_hour:
                hour_ago = now - timedelta(hours=1)
                per_hour = Complaint.objects.filter(
                    user=user, created_at__gte=hour_ago
                ).count()
                if per_hour >= settings.spam_max_per_hour:
                    if profile:
                        profile.is_spammer = True
                        profile.save(update_fields=["is_spammer"])
                    raise ValidationError(
                        {"detail": "Hourly complaint limit exceeded."}
                    )

        # 1) لو AI routing مطفي → لازم يختار قسم يدوي
        if not use_ai_routing and department is None:
            raise ValidationError(
                {"department_id": "Department is required when AI routing is disabled."}
            )

        # 2) fingerprint
        fp = make_fingerprint(raw_text)

        # نحفظ الشكوى مبدئياً
        obj = serializer.save(
            user=user,
            fingerprint=fp or None,
        )

        used_ai = False

        # 3) كشف التكرار (لو مفعّل)
        best_existing = None
        best_sim = 0.0

        if use_duplicate_detection and fp:
            existing_qs = (
                Complaint.objects.exclude(pk=obj.pk)
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

        if best_existing and best_sim >= sim_threshold:
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
                return  # ما في داعي نستخدم AI

        # 4) لا يوجد تكرار قوي → شكوى أصلية، نستخدم AI حسب الإعدادات

        # ملخص
        if use_ai_summary and obj.text and not obj.summary:
            summary = summarize_complaint(obj.text)
            if summary:
                obj.summary = summary
                used_ai = True

        # اختيار القسم بالـ AI
        if use_ai_routing and obj.text and obj.department_id is None:
            dept_id, score = classify_department_id(
                obj.text, min_score=ai_min_confidence
            )
            if dept_id:
                obj.department_id = dept_id
                used_ai = True
            obj.confidence = score

        # لو ما في AI routing، خلي الثقة 0 لو لسا فاضية
        if not use_ai_routing and obj.confidence is None:
            obj.confidence = 0.0

        # هذه الشكوى هي الأصلية (إن ما تم ربطها فوق)
        if not obj.base_complaint:
            obj.base_complaint = None
            obj.duplicate_index = 0

        obj.used_ai = used_ai
        obj.save()


class ComplaintFormPage(TemplateView):
    template_name = "complaints/submit.html"
