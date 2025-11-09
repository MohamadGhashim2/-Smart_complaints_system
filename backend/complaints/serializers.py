from rest_framework import serializers
from .models import Complaint, Department

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
        required=False
    )

    class Meta:
        model = Complaint
        fields = ["id","text","summary","status","created_at","department","department_id","confidence"]  # + confidence
        read_only_fields = ["id","summary","status","created_at","department","confidence"]
