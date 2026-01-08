# backend/complaints/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Complaint, Department


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name_tr", "name_ar", "code"]


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class ComplaintSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True,
        required=False,
        allow_null=True,
    )

    # صاحب الشكوى
    user_info = UserMiniSerializer(source="user", read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id",
            "user",          # id فقط
            "user_info",     # {id, username}
            "text",
            "summary",
            "status",
            "created_at",
            "in_review_at",
            "closed_at",
            "department",
            "department_id",
            "confidence",
            "used_ai",
            "duplicate_index",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "in_review_at",
            "closed_at",
            "confidence",
            "used_ai",
            "duplicate_index",
            "department",
        ]
