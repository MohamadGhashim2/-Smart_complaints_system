# users/admin.py
from django.contrib import admin
from .models import Profile, SystemSettings


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
