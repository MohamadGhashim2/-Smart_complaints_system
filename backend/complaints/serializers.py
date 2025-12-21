from rest_framework import serializers
from .models import Complaint, Department
from django.contrib.auth.models import User


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name_tr", "name_ar", "code"]


class ComplaintSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True,
        required=False,
    )

    # 👇 هنا نرجّع الـ base_complaint كـ ID (PK)
    base_complaint = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id",
            "user",
            "text",
            "summary",
            "status",
            "created_at",
            "department",
            "department_id",
            "confidence",
            "fingerprint",
            "base_complaint",   
            "duplicate_index",
            "used_ai",
        ]
        read_only_fields = [
            "id",
            "user",
            "summary",
            "status",
            "created_at",
            "department",
            "confidence",
            "fingerprint",
            "base_complaint",
            "duplicate_index",
            "used_ai",
        ]
