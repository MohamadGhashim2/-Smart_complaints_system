# users/serializers.py
from django.contrib.auth.models import User
from rest_framework import serializers

from complaints.models import Department
from complaints.serializers import DepartmentSerializer
from .models import Profile, SystemSettings
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class UserAdminSerializer(serializers.ModelSerializer):
    """
    إدارة المستخدمين من لوحة التحكم (admin panel).

    - يقرأ/يكتب بيانات الـ Profile كحقول top-level.
    - يعرض profile كامل + permissions dict للـ frontend.
    - يدعم إنشاء وتعديل كلمة السر (مع تحقق بسيط).
    """

    # حقول خاصة بالإنشاء/التعديل فقط (كلمة السر)
    password = serializers.CharField(write_only=True, required=False)
    password2 = serializers.CharField(write_only=True, required=False)

    # نعرض is_superuser للـ frontend (read-only)
    is_superuser = serializers.BooleanField(read_only=True)

    # حقول الـ Profile
    role = serializers.CharField(
        source="profile.role", allow_blank=True, required=False
    )
    national_id = serializers.CharField(
        source="profile.national_id",
        allow_blank=True,
        allow_null=True,
        required=False,
    )
    is_blocked = serializers.BooleanField(
        source="profile.is_blocked", required=False
    )
    is_spammer = serializers.BooleanField(
        source="profile.is_spammer", required=False
    )

    # نطاق مشاهدة الشكاوي
    view_scope = serializers.CharField(
        source="profile.view_scope", required=False, allow_blank=True
    )

    # IDs للوحدات المسموح بها (يُكتب)
    allowed_department_ids = serializers.PrimaryKeyRelatedField(
        source="profile.allowed_departments",
        many=True,
        queryset=Department.objects.all(),
        required=False,
        write_only=True,
    )

    # معلومات الوحدات (يُقرأ فقط)
    allowed_departments = DepartmentSerializer(
        source="profile.allowed_departments",
        many=True,
        read_only=True,
    )

    # permissions كـ dict جاهز للـ frontend
    permissions = serializers.SerializerMethodField(read_only=True)

    # profile كـ dict كامل (للـ frontend)
    profile = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "is_staff",
            "is_superuser",
            "password",
            "password2",
            "role",
            "national_id",
            "is_blocked",
            "is_spammer",
            "view_scope",
            "allowed_department_ids",
            "allowed_departments",
            "permissions",
            "profile",
        ]

    # -------- READ HELPERS --------

    def get_permissions(self, obj):
        try:
            p = obj.profile
        except Profile.DoesNotExist:
            return {}

        return {
            "read_complaints": p.can_read_complaints,
            "update_complaints": p.can_update_complaints,
            "reply_complaints": p.can_reply_complaints,
            "manage_departments": p.can_manage_departments,
            "manage_users": p.can_manage_users,
            "manage_ai_settings": p.can_manage_ai_settings,
        }

    def get_profile(self, obj):
        try:
            p = obj.profile
        except Profile.DoesNotExist:
            return None

        return {
            "role": p.role,
            "national_id": p.national_id,
            "is_blocked": p.is_blocked,
            "is_spammer": p.is_spammer,
            "can_read_complaints": p.can_read_complaints,
            "can_update_complaints": p.can_update_complaints,
            "can_reply_complaints": p.can_reply_complaints,
            "can_manage_departments": p.can_manage_departments,
            "can_manage_users": p.can_manage_users,
            "can_manage_ai_settings": p.can_manage_ai_settings,
            "view_scope": p.view_scope,
            "allowed_departments": [
                {"id": d.id, "name_tr": d.name_tr, "code": d.code}
                for d in p.allowed_departments.all()
            ],
        }

    # -------- INTERNAL HELPERS --------

    def _apply_permissions_from_request(self, profile):
        """
        يقرأ "permissions" من الـ request (self.initial_data)
        ويحولها لـ booleans على الـ Profile.
        """
        perms = self.initial_data.get("permissions")
        if not isinstance(perms, dict):
            return

        mapping = [
            ("read_complaints", "can_read_complaints"),
            ("update_complaints", "can_update_complaints"),
            ("reply_complaints", "can_reply_complaints"),
            ("manage_departments", "can_manage_departments"),
            ("manage_users", "can_manage_users"),
            ("manage_ai_settings", "can_manage_ai_settings"),
        ]
        for key, attr in mapping:
            if key in perms:
                setattr(profile, attr, bool(perms[key]))

    # -------- CREATE / UPDATE --------

    def create(self, validated_data):
        # بيانات الـ Profile من الحقول ذات source="profile.xxx"
        profile_data = validated_data.pop("profile", {})

        # كلمة السر من الـ request
        password = validated_data.pop("password", None)
        validated_data.pop("password2", None)  # ما نحتاجها بالباك إند

        username = validated_data.get("username")
        is_staff = validated_data.get("is_staff", False)

        # إنشاء المستخدم
        user = User(username=username, is_staff=is_staff)
        if password:
            user.set_password(password)
        else:
            user.set_password(User.objects.make_random_password())
        user.save()

        # إنشاء / إعداد الـ Profile
        profile = Profile.objects.create(
            user=user,
            role=profile_data.get("role") or "citizen",
            national_id=profile_data.get("national_id"),
            is_blocked=profile_data.get("is_blocked", False),
            is_spammer=profile_data.get("is_spammer", False),
            view_scope=profile_data.get("view_scope") or "all",
        )

        # allowed_departments جاية من allowed_department_ids
        allowed_deps = profile_data.get("allowed_departments")
        if allowed_deps is not None:
            profile.allowed_departments.set(allowed_deps)

        # صلاحيات القراءة/التحديث... إلخ
        self._apply_permissions_from_request(profile)
        profile.save()

        return user

    def update(self, instance, validated_data):
        # بيانات الـ Profile
        profile_data = validated_data.pop("profile", {})

        # كلمة السر (لو تم إرسالها)
        password = validated_data.pop("password", None)
        validated_data.pop("password2", None)

        if password:
            password2 = self.initial_data.get("password2")
            if password2 is not None and password != password2:
                raise serializers.ValidationError(
                    {"password2": "Şifreler eşleşmiyor."}
                )
            if len(password) < 6:
                raise serializers.ValidationError(
                    {"password": "Şifre en az 6 karakter olmalıdır."}
                )
            instance.set_password(password)

        # تحديث username / is_staff
        username = validated_data.get("username")
        if username is not None:
            instance.username = username

        is_staff = validated_data.get("is_staff")
        if is_staff is not None:
            instance.is_staff = is_staff

        instance.save()

        # جلب / إنشاء الـ Profile
        profile, _ = Profile.objects.get_or_create(user=instance)

        for attr in ["role", "national_id", "is_blocked", "is_spammer", "view_scope"]:
            if attr in profile_data:
                setattr(profile, attr, profile_data[attr])

        # allowed_departments من allowed_department_ids
        allowed_deps = profile_data.get("allowed_departments", None)
        if allowed_deps is not None:
            profile.allowed_departments.set(allowed_deps)

        # صلاحيات القراءة/التحديث... إلخ
        self._apply_permissions_from_request(profile)
        profile.save()

        return instance


class RegisterSerializer(serializers.Serializer):
    """
    تسجيل المواطن من صفحة التسجيل العامة.
    """

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    national_id = serializers.CharField(
        max_length=11, required=False, allow_blank=True
    )

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password2": "Şifreler eşleşmiyor."}
            )
        if len(attrs["password"]) < 6:
            raise serializers.ValidationError(
                {"password": "Şifre en az 6 karakter olmalıdır."}
            )
        return attrs

    def create(self, validated_data):
        username = validated_data["username"]
        password = validated_data["password"]
        national_id = validated_data.get("national_id") or None

        user = User.objects.create_user(username=username, password=password)
        Profile.objects.create(
            user=user,
            role="citizen",
            national_id=national_id,
            is_blocked=False,
            is_spammer=False,
            view_scope="all",
        )
        return user


class SystemSettingsSerializer(serializers.ModelSerializer):
    """
    إعدادات النظام / الذكاء الاصطناعي (singleton).
    """

    class Meta:
        model = SystemSettings
        fields = [
            "use_ai_summary",
            "use_ai_routing",
            "use_duplicate_detection",
            "ai_min_confidence",
            "similarity_threshold",
            "spam_max_per_day",
            "spam_max_per_hour",
            "allow_citizen_registration",
        ]
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    JWT login için özel serializer.
    profile.is_blocked = True ise girişe izin vermez.
    """

    def validate(self, attrs):
        # önce normal doğrulama (kullanıcı adı + şifre)
        data = super().validate(attrs)
        user = self.user

        try:
            profile = user.profile
        except Profile.DoesNotExist:
            profile = None

        # Hesap engelliyse hata fırlat
        if profile and profile.is_blocked:
            raise serializers.ValidationError(
                {
                    "detail": "Hesabınız engellenmiştir. Lütfen belediye ile iletişime geçin."
                }
            )


        return data
