# users/admin.py
from django.contrib import admin
from .models import AuditLog, Profile, SystemSettings


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role", "national_id", "is_blocked", "is_spammer")
    list_filter = ("role", "is_blocked", "is_spammer")
    search_fields = ("user__username", "national_id", "user__username")



@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "use_ai_summary",
        "use_ai_routing",
        "use_duplicate_detection",
        "ai_min_confidence",
        "similarity_threshold",
        "spam_max_per_day",
        "spam_max_per_hour",
        "allow_citizen_registration",
        "updated_at",
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "action", "actor", "target_type", "target_id", "created_at")
    list_filter = ("action", "target_type", "created_at")
    search_fields = ("target_type", "target_id", "actor__username")
    readonly_fields = ("action", "actor", "target_type", "target_id", "metadata", "created_at")