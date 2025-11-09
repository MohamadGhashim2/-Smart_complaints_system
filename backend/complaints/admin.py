from django.contrib import admin
from .models import Complaint, Department

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "name_tr", "code")
    search_fields = ("name_tr", "name_ar", "code")

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "department", "confidence", "created_at")  # + confidence
    list_filter = ("status", "department", "created_at")
    search_fields = ("text", "summary")
