# users/views.py
from django.contrib.auth.models import User
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Profile, SystemSettings
from .serializers import (
    UserAdminSerializer,
    RegisterSerializer,
    SystemSettingsSerializer,
    CustomTokenObtainPairSerializer,
)


class CanManageUsers(permissions.BasePermission):
    """
    يسمح فقط للمستخدمين الذين لديهم can_manage_users (أو superuser)
    بالدخول إلى /api/v1/users/.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        try:
            profile = user.profile
        except Profile.DoesNotExist:
            return False

        return bool(profile.can_manage_users)


class CanManageAISettings(permissions.BasePermission):
    """
    صلاحية تعديل إعدادات النظام / الذكاء الاصطناعي.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        try:
            profile = user.profile
        except Profile.DoesNotExist:
            return False

        return bool(profile.can_manage_ai_settings)

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    /api/auth/token/ için özel view.
    Kullanıcının engelli olup olmadığını kontrol eden serializer kullanır.
    """
    serializer_class = CustomTokenObtainPairSerializer

# --- Auth / Profile / Register ---


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/  → تسجيل مواطن جديد.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        # اختيارياً: منع التسجيل إذا كان الإعداد مغلقاً
        try:
            settings_obj = SystemSettings.objects.first()
        except SystemSettings.DoesNotExist:
            settings_obj = None

        if settings_obj and not settings_obj.allow_citizen_registration:
            raise PermissionDenied("Yeni vatandaş kaydı şu anda kapalı.")
        serializer.save()


class ProfileMeView(generics.RetrieveAPIView):
    """
    GET /api/v1/auth/me/  → معلومات المستخدم الحالي + profile + permissions
    """
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# --- System settings / AI ---


class SystemSettingsView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/settings/  → قراءة إعدادات النظام
    PATCH /api/v1/settings/  → تعديل إعدادات النظام
    (singleton record)
    """

    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageAISettings]

    def get_object(self):
        obj, _ = SystemSettings.objects.get_or_create(pk=1)
        return obj


# --- User management (admin / manager) ---


class UserListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/users/   → قائمة جميع المستخدمين (للإدارة)
    POST /api/v1/users/   → إنشاء مستخدم جديد (Admin / مدير الموارد البشرية مثلاً)
    """
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]
    queryset = User.objects.all().order_by("id")


class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET    /api/v1/users/<id>/  → تفاصيل مستخدم واحد
    PATCH  /api/v1/users/<id>/  → تعديل المستخدم + صلاحياته + view_scope + allowed_departments + كلمة السر
    """
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]
    queryset = User.objects.all().order_by("id")
