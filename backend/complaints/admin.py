from django.contrib import admin
from .models import Complaint, Department

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name_tr", "code")
    search_fields = ("name_tr", "name_ar", "code")

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = (
        "id", "status", "department", "confidence",
        "duplicate_index", "base_complaint", "used_ai",
        "created_at",
    )
    list_editable = ("status", "department")
    list_filter = ("status", "department", "created_at", "duplicate_index", "used_ai")
    search_fields = ("text", "summary", "fingerprint")
    readonly_fields = ("confidence", "created_at", "fingerprint", "duplicate_index", "used_ai")
