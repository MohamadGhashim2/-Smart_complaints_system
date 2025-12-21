# users/permissions.py
from rest_framework.permissions import BasePermission
from .models import Profile


class CanManageUsers(BasePermission):
    """
    يسمح فقط لمن لديهم صلاحية can_manage_users أو superuser
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


class CanManageAISettings(BasePermission):
    """
    يسمح فقط لمن لديهم صلاحية can_manage_ai_settings أو superuser
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
