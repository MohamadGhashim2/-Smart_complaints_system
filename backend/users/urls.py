# users/urls.py
from django.urls import path
from .views import (
    RegisterView,
    ProfileMeView,
    SystemSettingsView,
    AdminUsersView,
    AdminUserDetailView,
)

urlpatterns = [
    # للمواطنين
    path("auth/register/", RegisterView.as_view(), name="user-register"),
    path("auth/profile/", ProfileMeView.as_view(), name="user-profile"),

    # إعدادات النظام / الذكاء الاصطناعي
    path("settings/", SystemSettingsView.as_view(), name="system-settings"),

    # إدارة المستخدمين (admin / manager)
    path("users/", AdminUsersView.as_view(), name="users-admin-list-create"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="users-admin-detail"),
]
