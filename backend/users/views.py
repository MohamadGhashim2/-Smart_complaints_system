# users/views.py
from django.contrib.auth.models import User
from django.http import Http404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import Profile, SystemSettings
from .serializers import SystemSettingsSerializer


# --------- Permissions ---------

class CanManageAISettings(permissions.BasePermission):
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


class CanManageUsers(permissions.BasePermission):
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


# --------- Helpers ---------

def serialize_user(u: User):
    """شكل واحد لبيانات المستخدم للـ Dashboard."""
    p = getattr(u, "profile", None)

    # الدور
    if p and p.role:
        role = p.role
    else:
        if u.is_superuser:
            role = "Manager"
        elif u.is_staff:
            role = "Staff"
        else:
            role = "Citizen"

    perms = {
        "read_complaints": bool(getattr(p, "can_read_complaints", False)),
        "update_complaints": bool(getattr(p, "can_update_complaints", False)),
        "reply_complaints": bool(getattr(p, "can_reply_complaints", False)),
        "manage_departments": bool(getattr(p, "can_manage_departments", False)),
        "manage_users": bool(getattr(p, "can_manage_users", False)),
        "manage_ai_settings": bool(getattr(p, "can_manage_ai_settings", False)),
    }

    return {
        "id": u.id,
        "username": u.username,
        "role": role,
        "is_staff": u.is_staff,
        "national_id": getattr(p, "national_id", "") or "",
        "is_blocked": bool(getattr(p, "is_blocked", False)),
        "is_spammer": bool(getattr(p, "is_spammer", False)),
        "permissions": perms,
    }


def _extract_perm(perms_dict, data_dict, key, alt=None, default=False):
    """نقرأ نفس البيرم من أكثر من اسم في الـ JSON."""
    if alt is None:
        alt = key

    # لو الـ key موجود صراحةً في أي dict نستخدم قيمته
    if key in perms_dict or alt in perms_dict:
        return bool(perms_dict.get(key) or perms_dict.get(alt))
    if key in data_dict or alt in data_dict:
        return bool(data_dict.get(key) or data_dict.get(alt))
    return default


# --------- Citizen registration & profile ---------

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        settings = SystemSettings.get_solo()
        if not settings.allow_citizen_registration:
            return Response(
                {"detail": "Registration is currently disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()
        national_id = (data.get("national_id") or "").strip()

        if not username or not password or not national_id:
            return Response(
                {"detail": "username, password and national_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 6:
            return Response(
                {"detail": "Password must be at least 6 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"detail": "Username already taken."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Profile.objects.filter(national_id=national_id).exists():
            return Response(
                {"detail": "An account with this national ID already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(username=username, password=password)
        user.is_staff = False
        user.save(update_fields=["is_staff"])

        profile = Profile.objects.create(
            user=user,
            role="Citizen",
            national_id=national_id,
        )

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "role": profile.role,
                "national_id": profile.national_id,
            },
            status=status.HTTP_201_CREATED,
        )


class ProfileMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, "profile", None)

        data = {
            "id": user.id,
            "username": user.username,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "groups": [g.name for g in user.groups.all()],
            "profile": None,
        }

        if profile:
            data["profile"] = {
                "role": profile.role,
                "national_id": profile.national_id,
                "is_blocked": profile.is_blocked,
                "is_spammer": profile.is_spammer,
                "permissions": {
                    "read_complaints": profile.can_read_complaints,
                    "update_complaints": profile.can_update_complaints,
                    "reply_complaints": profile.can_reply_complaints,
                    "manage_departments": profile.can_manage_departments,
                    "manage_users": profile.can_manage_users,
                    "manage_ai_settings": profile.can_manage_ai_settings,
                },
            }

        return Response(data)


# --------- System settings (AI & spam limits) ---------

class SystemSettingsView(APIView):
    def get_permissions(self):
        # قراءة الإعدادات مسموحة للجميع (عشان الفرونت يعرف يشغّل/يطفي AI)
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        # التعديل فقط للي عنده صلاحية manage_ai_settings أو superuser
        return [permissions.IsAuthenticated(), CanManageAISettings()]

    def get(self, request):
        obj = SystemSettings.get_solo()
        serializer = SystemSettingsSerializer(obj)
        return Response(serializer.data)

    def patch(self, request):
        obj = SystemSettings.get_solo()
        serializer = SystemSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(SystemSettingsSerializer(obj).data)


# --------- Admin users list / create ---------

class AdminUsersView(APIView):
    """
    GET  /api/v1/users/      -> list
    POST /api/v1/users/      -> create new user
    """
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]

    def get(self, request):
        users = User.objects.all().select_related("profile").order_by("id")
        rows = [serialize_user(u) for u in users]
        return Response(rows)

    def post(self, request):
        data = request.data

        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()
        role = (data.get("role") or "Citizen").strip()
        national_id = (data.get("national_id") or "").strip()
        is_staff_flag = bool(data.get("is_staff"))

        if not username or not password:
            return Response(
                {"detail": "username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"detail": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # تحقق من الرقم الوطني لو Citizen
        if role == "Citizen":
            if not national_id or len(national_id) != 11:
                return Response(
                    {"detail": "Citizen must have 11-digit national_id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if Profile.objects.filter(national_id=national_id).exists():
                return Response(
                    {"detail": "national_id already used."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        perms = data.get("permissions") or {}

        can_read = _extract_perm(perms, data, "read_complaints", "can_read_complaints")
        can_update = _extract_perm(perms, data, "update_complaints", "can_update_complaints")
        can_reply = _extract_perm(perms, data, "reply_complaints", "can_reply_complaints")
        can_manage_deps = _extract_perm(perms, data, "manage_departments", "can_manage_departments")
        can_manage_users = _extract_perm(perms, data, "manage_users", "can_manage_users")
        can_manage_ai = _extract_perm(perms, data, "manage_ai_settings", "can_manage_ai_settings")

        user = User.objects.create_user(username=username, password=password)

        # staff flag من الدور أو من الـ checkbox
        if role in ["Staff", "Manager"] or is_staff_flag:
            user.is_staff = True
        user.save(update_fields=["is_staff"])

        Profile.objects.create(
            user=user,
            role=role,
            national_id=national_id or None,
            can_read_complaints=can_read,
            can_update_complaints=can_update,
            can_reply_complaints=can_reply,
            can_manage_departments=can_manage_deps,
            can_manage_users=can_manage_users,
            can_manage_ai_settings=can_manage_ai,
        )

        return Response(serialize_user(user), status=status.HTTP_201_CREATED)


# --------- Admin user detail (edit / delete) ---------

class AdminUserDetailView(APIView):
    """
    GET    /api/v1/users/<id>/   -> بيانات مستخدم واحد (للتعديل)
    PATCH  /api/v1/users/<id>/   -> تعديل
    DELETE /api/v1/users/<id>/   -> حذف
    """
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]

    def get_object(self, pk):
        try:
            return User.objects.select_related("profile").get(pk=pk)
        except User.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        u = self.get_object(pk)
        return Response(serialize_user(u))

    def patch(self, request, pk):
        u = self.get_object(pk)
        data = request.data
        profile, _ = Profile.objects.get_or_create(user=u, defaults={"role": "Citizen"})

        username = data.get("username")
        role = data.get("role")
        national_id = data.get("national_id")
        is_staff_flag = data.get("is_staff")
        is_blocked = data.get("is_blocked")
        is_spammer = data.get("is_spammer")
        perms = data.get("permissions") or {}

        # username
        if username is not None:
            username = username.strip()
            if not username:
                return Response(
                    {"detail": "username cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if User.objects.exclude(pk=u.pk).filter(username=username).exists():
                return Response(
                    {"detail": "Username already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            u.username = username

        # role
        if role:
            profile.role = role

        # national_id
        if national_id is not None:
            national_id = national_id.strip() or None
            if national_id:
                if (
                    len(national_id) != 11
                    and (role == "Citizen" or profile.role == "Citizen")
                ):
                    return Response(
                        {"detail": "Citizen must have 11-digit national_id."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if Profile.objects.exclude(pk=profile.pk).filter(
                    national_id=national_id
                ).exists():
                    return Response(
                        {"detail": "national_id already used."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            profile.national_id = national_id

        # staff flag
        if is_staff_flag is not None:
            u.is_staff = bool(is_staff_flag)
        else:
            if role in ["Staff", "Manager"]:
                u.is_staff = True
            elif role == "Citizen" and not u.is_superuser:
                u.is_staff = False

        # block / spam
        if is_blocked is not None:
            profile.is_blocked = bool(is_blocked)
        if is_spammer is not None:
            profile.is_spammer = bool(is_spammer)

        # permissions (لو مبعوثة، نحدث؛ لو ما مبعوثة نتركها كما هي)
        profile.can_read_complaints = _extract_perm(
            perms, data, "read_complaints", "can_read_complaints",
            default=profile.can_read_complaints,
        )
        profile.can_update_complaints = _extract_perm(
            perms, data, "update_complaints", "can_update_complaints",
            default=profile.can_update_complaints,
        )
        profile.can_reply_complaints = _extract_perm(
            perms, data, "reply_complaints", "can_reply_complaints",
            default=profile.can_reply_complaints,
        )
        profile.can_manage_departments = _extract_perm(
            perms, data, "manage_departments", "can_manage_departments",
            default=profile.can_manage_departments,
        )
        profile.can_manage_users = _extract_perm(
            perms, data, "manage_users", "can_manage_users",
            default=profile.can_manage_users,
        )
        profile.can_manage_ai_settings = _extract_perm(
            perms, data, "manage_ai_settings", "can_manage_ai_settings",
            default=profile.can_manage_ai_settings,
        )

        u.save()
        profile.save()

        return Response(serialize_user(u))

    def delete(self, request, pk):
        u = self.get_object(pk)
        if u.is_superuser:
            return Response(
                {"detail": "Cannot delete superuser."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        u.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
