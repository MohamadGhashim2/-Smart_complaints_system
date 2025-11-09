# complaints/views.py
from rest_framework import generics
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Complaint, Department
from .serializers import ComplaintSerializer, DepartmentSerializer
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView

# استدعاء المصنّف
from .ai_classifier import classify_department_code

class DepartmentListView(generics.ListAPIView):
    queryset = Department.objects.all().order_by("name_tr")
    serializer_class = DepartmentSerializer

@method_decorator(ensure_csrf_cookie, name='dispatch')
class ComplaintListCreateView(generics.ListCreateAPIView):
    queryset = Complaint.objects.all().order_by("-created_at")
    serializer_class = ComplaintSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "department"]
    ordering_fields = ["created_at"]

    def perform_create(self, serializer):
        # نحفظ أولًا
        obj = serializer.save()

        # إذا الجهة غير محددة يدويًا والمستخدم أرسل نصًا
        if obj.department_id is None and obj.text:
            dept_code, score = classify_department_code(obj.text, min_score=0.55)
            if dept_code:
                try:
                    dept = Department.objects.get(code=dept_code)
                    obj.department = dept
                except Department.DoesNotExist:
                    pass
            obj.confidence = score  # NEW
            obj.save()


# complaints/views.py
from django.views.generic import TemplateView

class ComplaintFormPage(TemplateView):
    template_name = "complaints/submit.html"
