# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import SystemSettings, Profile

User = get_user_model()


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            "id",
            "use_ai_summary",
            "use_ai_routing",
            "use_duplicate_detection",
            "ai_min_confidence",
            "similarity_threshold",
            "spam_max_per_day",
            "spam_max_per_hour",
            "allow_citizen_registration",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RegisterSerializer(serializers.Serializer):
    """
    تسجيل مواطن جديد من واجهة Register
    """

    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    national_id = serializers.CharField(write_only=True, min_length=11, max_length=11)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_national_id(self, value):
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError("National ID must be exactly 11 digits.")
        if Profile.objects.filter(national_id=value).exists():
            raise serializers.ValidationError("This national ID is already registered.")
        return value

    def create(self, validated_data):
        username = validated_data["username"]
        password = validated_data["password"]
        national_id = validated_data["national_id"]

        user = User.objects.create_user(
            username=username,
            password=password,
            is_staff=False,
            is_superuser=False,
        )

        Profile.objects.create(
            user=user,
            role="citizen",
            national_id=national_id,
            # باقي الصلاحيات سيتم تصفيرها في Profile.apply_role_rules()
        )

        return user


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "id",
            "role",
            "national_id",
            "is_blocked",
            "is_spammer",
            "can_read_complaints",
            "can_update_complaints",
            "can_reply_complaints",
            "can_manage_departments",
            "can_manage_users",
            "can_manage_ai_settings",
        ]
        extra_kwargs = {field: {"required": False} for field in fields}

    def validate_national_id(self, value):
        if not value:
            return None
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError("National ID must be exactly 11 digits.")

        qs = Profile.objects.filter(national_id=value)
        instance = getattr(self, "instance", None)
        if instance is not None:
            qs = qs.exclude(pk=instance.pk)

        if qs.exists():
            raise serializers.ValidationError("This national ID is already used.")
        return value

    def validate(self, attrs):
        """
        توحيد الدور + التحقق من أن المواطن لديه رقم وطني.
        (قواعد الصلاحيات نفسها تُطبق داخل Profile.apply_role_rules)
        """
        role = attrs.get("role")
        if not role and self.instance:
            role = self.instance.role

        if role:
            role = role.lower()
            attrs["role"] = role

        if role == "citizen":
            # المواطن يجب أن يملك national_id (سواء في attrs أو في instance)
            national_id = attrs.get("national_id")
            if national_id is None and self.instance:
                national_id = self.instance.national_id
            if not national_id:
                raise serializers.ValidationError(
                    {"national_id": "National ID is required for citizens."}
                )

        return attrs


class UserDetailSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ["id", "username", "is_staff", "is_superuser", "profile"]
        read_only_fields = ["id", "is_superuser"]
        extra_kwargs = {
            "username": {"required": False},
            "is_staff": {"required": False},
        }

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)

        # تحديث User
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # تحديث أو إنشاء Profile
        if profile_data is not None:
            profile, _ = Profile.objects.get_or_create(user=instance)
            serializer = ProfileSerializer(profile, data=profile_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

        return instance


class UserListSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "is_staff", "is_superuser", "profile"]


class UserCreateSerializer(serializers.Serializer):
    """
    إنشاء مستخدم جديد من واجهة المدير (موظف / مدير / مواطن)
    """

    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=[choice[0] for choice in Profile.ROLE_CHOICES])
    national_id = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=11
    )
    # is_staff لن نعتمد عليه من الـ API – سنشتقه من role
    is_staff = serializers.BooleanField(required=False, default=False)

    can_read_complaints = serializers.BooleanField(required=False, default=False)
    can_update_complaints = serializers.BooleanField(required=False, default=False)
    can_reply_complaints = serializers.BooleanField(required=False, default=False)
    can_manage_departments = serializers.BooleanField(required=False, default=False)
    can_manage_users = serializers.BooleanField(required=False, default=False)
    can_manage_ai_settings = serializers.BooleanField(required=False, default=False)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_national_id(self, value):
        role = self.initial_data.get("role")
        if role == "citizen":
            if not value:
                raise serializers.ValidationError(
                    "National ID is required for citizens."
                )
            if not value.isdigit() or len(value) != 11:
                raise serializers.ValidationError(
                    "National ID must be exactly 11 digits."
                )
        if value:
            if Profile.objects.filter(national_id=value).exists():
                raise serializers.ValidationError(
                    "This national ID is already registered."
                )
        return value

    def create(self, validated_data):
        username = validated_data["username"]
        password = validated_data["password"]
        role = validated_data["role"]
        national_id = validated_data.get("national_id") or None

        # is_staff مشتقة من الدور فقط
        is_staff = role in ("staff", "manager")

        user = User.objects.create_user(
            username=username,
            password=password,
            is_staff=is_staff,
            is_superuser=False,
        )

        Profile.objects.create(
            user=user,
            role=role,
            national_id=national_id,
            can_read_complaints=validated_data.get("can_read_complaints", False),
            can_update_complaints=validated_data.get("can_update_complaints", False),
            can_reply_complaints=validated_data.get("can_reply_complaints", False),
            can_manage_departments=validated_data.get("can_manage_departments", False),
            can_manage_users=validated_data.get("can_manage_users", False),
            can_manage_ai_settings=validated_data.get("can_manage_ai_settings", False),
            # لاحظ أن Profile.apply_role_rules سيعدل الصلاحيات تلقائياً
        )

        return user
