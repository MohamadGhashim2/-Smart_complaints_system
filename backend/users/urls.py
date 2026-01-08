# users/urls.py
from django.urls import path
from .views import (
    RegisterView,
    ProfileMeView,
    SystemSettingsView,
    UserListCreateView,
    UserDetailView,
)

urlpatterns = [
    # تسجيل / معلوماتي
    path("auth/register/", RegisterView.as_view(), name="user-register"),
    path("auth/me/", ProfileMeView.as_view(), name="user-me"),

    # إعدادات النظام / الذكاء الاصطناعي
    path("settings/", SystemSettingsView.as_view(), name="system-settings"),

    # إدارة المستخدمين (admin / manager)
    path("users/", UserListCreateView.as_view(), name="users-admin-list-create"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="users-admin-detail"),
]
