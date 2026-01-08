from django.db import models
from django.conf import settings
from django.core.validators import MinLengthValidator, RegexValidator


class Profile(models.Model):
    """
    بروفايل لكل مستخدم:
    - يحدد هل هو مدير / موظف / مواطن
    - رقم وطني للمواطنين (11 رقم، فريد)
    - صلاحيات تفصيلية للموظفين والمدير
    """

    ROLE_CHOICES = [
        ("manager", "Manager"),   # مدير النظام
        ("staff", "Staff"),       # موظف
        ("citizen", "Citizen"),   # مواطن
    ]

    # كيف يشوف الشكاوي؟
    # all        -> كل الشكاوي (افتراضي للمدير / أغلب الموظفين)
    # assigned   -> فقط الشكاوي التابعة لوحدات محددة
    # unassigned -> فقط الشكاوي التي لا تحتوي على وحدة (department = NULL)
    VIEW_SCOPE_CHOICES = [
        ("all", "Tüm şikâyetler"),
        ("assigned", "Sadece atanmış birimler"),
        ("unassigned", "Sadece birimi olmayan şikâyetler"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="citizen",
    )

    # الرقم الوطني (للمواطنين) – 11 رقم – فريد
    national_id = models.CharField(
        max_length=11,
        unique=True,
        null=True,
        blank=True,
        validators=[
            MinLengthValidator(11, "National ID must be 11 digits."),
            RegexValidator(
                r"^\d{11}$",
                "National ID must contain exactly 11 digits.",
            ),
        ],
        help_text="11-digit national ID for citizens.",
    )

    # حظر المواطن من إرسال الشكاوي
    is_blocked = models.BooleanField(default=False)

    # تم اعتباره سبّام (مثلاً بسبب شكاوي كثيرة جداً)
    is_spammer = models.BooleanField(default=False)

    # صلاحيات الموظفين / المدير
    can_read_complaints = models.BooleanField(default=False)
    can_update_complaints = models.BooleanField(default=False)
    can_reply_complaints = models.BooleanField(default=False)
    can_manage_departments = models.BooleanField(default=False)
    can_manage_users = models.BooleanField(default=False)
    can_manage_ai_settings = models.BooleanField(default=False)

    # أي شكاوي يمكن لهذا الموظف أن يراها؟
    view_scope = models.CharField(
        max_length=20,
        choices=VIEW_SCOPE_CHOICES,
        default="all",
        help_text=(
            "Personelin hangi şikâyetleri görebileceğini belirler: "
            "'all' = tümü, 'assigned' = sadece atanmış birimler, "
            "'unassigned' = sadece birimi olmayan şikâyetler."
        ),
    )

    # إذا كان view_scope = "assigned" → فقط هذه الوحدات مسموحة
    allowed_departments = models.ManyToManyField(
        "complaints.Department",
        blank=True,
        related_name="staff_profiles",
        help_text="view_scope = 'assigned' ise erişebileceği birimler.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --------- قواعد الدور والصلاحيات ---------

    def apply_role_rules(self):
        """
        توحيد الدور + فرض الصلاحيات حسب الدور:
        - citizen  -> كل الصلاحيات False + is_staff=False
        - staff    -> الصلاحيات كما هي، لكن is_staff=True
        - manager  -> كل الصلاحيات True + is_staff=True
        """
        # توحيد الدور إلى lower-case
        role = (self.role or "citizen").lower()
        valid_roles = {choice[0] for choice in self.ROLE_CHOICES}
        if role not in valid_roles:
            role = "citizen"
        self.role = role

        # تنظيف national_id الفارغ
        if self.national_id == "":
            self.national_id = None

        perm_fields = [
            "can_read_complaints",
            "can_update_complaints",
            "can_reply_complaints",
            "can_manage_departments",
            "can_manage_users",
            "can_manage_ai_settings",
        ]

        if role == "citizen":
            # مواطن: ممنوع أي صلاحية إدارية
            for f in perm_fields:
                setattr(self, f, False)
            # للمواطن ما بهمنا موضوع view_scope
            if self.view_scope != "all":
                self.view_scope = "all"

        elif role == "manager":
            # مدير: كل الصلاحيات مفعلة
            for f in perm_fields:
                setattr(self, f, True)
            # المدير غالباً يشوف كل الشكاوي
            if not self.view_scope:
                self.view_scope = "all"

        # staff: نتركها كما جاءت من الـ API (المسؤول يضبط view_scope والـ departments)

        # مزامنة user.is_staff مع الدور (إلا إذا كان superuser)
        if self.user_id:
            u = self.user
            if role in ("staff", "manager"):
                if not u.is_staff:
                    u.is_staff = True
                    u.save(update_fields=["is_staff"])
            elif role == "citizen" and not u.is_superuser:
                if u.is_staff:
                    u.is_staff = False
                    u.save(update_fields=["is_staff"])

    def save(self, *args, **kwargs):
        self.apply_role_rules()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

    class Meta:
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"

    
class SystemSettings(models.Model):
    """
    إعدادات النظام العامة:
    - التحكم بالذكاء الاصطناعي (تشغيل/إيقاف التلخيص/التصنيف/التكرار)
    - نسب الثقة والتشابه
    - حدود السبام
    - السماح أو منع تسجيل المواطنين
    """


    # AI toggles
    use_ai_summary = models.BooleanField(default=True)
    use_ai_routing = models.BooleanField(default=True)
    use_duplicate_detection = models.BooleanField(default=True)


    # thresholds
    ai_min_confidence = models.FloatField(
        default=0.5,
        help_text="Minimum confidence from AI to accept department routing.",
    )

    similarity_threshold = models.FloatField(
        default=0.7,
        help_text="Similarity (0–1) above which a complaint is considered duplicate.",
    )

    # spam rules
    spam_max_per_day = models.PositiveIntegerField(
        default=20,
        help_text="Max complaints per user per day before considered spam.",
    )
    spam_max_per_hour = models.PositiveIntegerField(
        default=10,
        help_text="Max complaints per user per hour before considered spam.",
    )

    # citizen registration
    allow_citizen_registration = models.BooleanField(
        default=True,
        help_text="If false, new citizens cannot register.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "System Settings"

    @classmethod
    def get_solo(cls):
        """
        نضمن وجود سجل واحد فقط للإعدادات.
        نستدعيها من أي مكان في الكود:
            settings = SystemSettings.get_solo()
        """
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"
