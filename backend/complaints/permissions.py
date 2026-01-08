# backend/complaints/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsStaffOrReadOnly(BasePermission):
    """
    GET/HEAD/OPTIONS مسموح للجميع (أو لأي شخص داخل النظام حسب رغبتك)
    POST/PATCH/PUT/DELETE فقط للـ staff (admin/superadmin)
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
