import random
from dataclasses import dataclass

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from complaints.models import Complaint, Department
from users.models import Profile


@dataclass(frozen=True)
class CitizenSeed:
    username: str
    national_id: str


DEPARTMENTS = [
    {"code": "MUN_CLEAN", "name_tr": "Belediye Temizlik", "name_ar": "بلدية النظافة"},
    {"code": "MUN_ROADS", "name_tr": "Belediye Yol Bakım", "name_ar": "بلدية الطرق"},
    {"code": "MUN_WATER", "name_tr": "Belediye Su Kanal", "name_ar": "بلدية المياه والصرف"},
    {"code": "MUN_LIGHT", "name_tr": "Belediye Aydınlatma", "name_ar": "بلدية الإنارة"},
    {"code": "MUN_PARKS", "name_tr": "Belediye Parklar", "name_ar": "بلدية الحدائق"},
    {"code": "MUN_LICENSE", "name_tr": "Belediye Ruhsat", "name_ar": "بلدية التراخيص"},
]

TEXT_TEMPLATES = [
    "تراكم نفايات في الحي منذ {n} أيام بدون جمع منتظم.",
    "وجود حفرة كبيرة في الطريق العام قرب المدرسة.",
    "انقطاع مياه متكرر في البناء رقم {n}.",
    "إنارة الشارع معطلة ليلاً في المنطقة.",
    "الحديقة العامة مهملة وتحتاج صيانة وتنظيف.",
    "ازدحام شديد بسبب إشارة مرور متوقفة عن العمل.",
    "انتشار روائح كريهة قرب حاويات القمامة.",
    "تسرب مياه في الشارع الرئيسي منذ الصباح.",
    "ضجيج أعمال حفر مستمر خلال ساعات الليل.",
    "تأخر معاملة ترخيص البناء منذ فترة طويلة.",
]

STATUSES = ["new", "in_review", "closed"]


class Command(BaseCommand):
    help = "Seed demo municipalities, citizens, staff, and random complaints."

    def add_arguments(self, parser):
        parser.add_argument("--citizens", type=int, default=6, help="Number of citizens to create.")
        parser.add_argument(
            "--complaints-per-citizen",
            type=int,
            default=6,
            help="Number of complaints for each citizen.",
        )
        parser.add_argument(
            "--password",
            type=str,
            default="Demo@12345",
            help="Password used for all generated users.",
        )
        parser.add_argument(
            "--reset-demo",
            action="store_true",
            help="Delete existing demo citizens/staff and their complaints first.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        citizens_count = max(options["citizens"], 1)
        complaints_per_citizen = max(options["complaints_per_citizen"], 1)
        password = options["password"]
        reset_demo = options["reset_demo"]

        if reset_demo:
            demo_users = User.objects.filter(
                Q(username__startswith="citizen_demo_")
                | Q(username__startswith="staff_")
                | Q(username="assistant_manager")
            )
            deleted_complaints, _ = Complaint.objects.filter(user__in=demo_users).delete()
            Profile.objects.filter(user__in=demo_users).delete()
            deleted_users, _ = demo_users.delete()
            self.stdout.write(
                self.style.WARNING(
                    f"Reset done: deleted {deleted_users} users and {deleted_complaints} complaints."
                )
            )

        departments = []
        for d in DEPARTMENTS:
            dep, _ = Department.objects.update_or_create(
                code=d["code"],
                defaults={"name_tr": d["name_tr"], "name_ar": d["name_ar"]},
            )
            departments.append(dep)

        seeded_users = []
        # Citizens
        for i in range(1, citizens_count + 1):
            citizen = CitizenSeed(
                username=f"citizen_demo_{i}",
                national_id=str(10_000_000_000 + i),
            )
            user = self._upsert_user(
                username=citizen.username,
                password=password,
                first_name=f"Citizen{i}",
                last_name="Demo",
                email=f"{citizen.username}@example.com",
                is_staff=False,
            )

            profile, _ = Profile.objects.get_or_create(user=user)
            profile.role = "citizen"
            profile.national_id = citizen.national_id
            profile.is_blocked = False
            profile.is_spammer = False
            profile.save()
            seeded_users.append(user)

        # Department staff (1 per municipality)
        department_staff_count = 0
        for dep in departments:
            username = f"staff_{dep.code.lower()}"
            user = self._upsert_user(
                username=username,
                password=password,
                first_name="Staff",
                last_name=dep.code,
                email=f"{username}@example.com",
                is_staff=True,
            )
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.role = "staff"
            profile.national_id = None
            profile.can_read_complaints = True
            profile.can_update_complaints = True
            profile.can_reply_complaints = True
            profile.can_manage_departments = False
            profile.can_manage_users = False
            profile.can_manage_ai_settings = False
            profile.view_scope = "assigned"
            profile.save()
            profile.allowed_departments.set([dep])
            department_staff_count += 1

        # Assistant manager (operational supervisor)
        assistant = self._upsert_user(
            username="assistant_manager",
            password=password,
            first_name="Assistant",
            last_name="Manager",
            email="assistant_manager@example.com",
            is_staff=True,
        )
        assistant_profile, _ = Profile.objects.get_or_create(user=assistant)
        assistant_profile.role = "staff"
        assistant_profile.national_id = None
        assistant_profile.can_read_complaints = True
        assistant_profile.can_update_complaints = True
        assistant_profile.can_reply_complaints = True
        assistant_profile.can_manage_departments = True
        assistant_profile.can_manage_users = False
        assistant_profile.can_manage_ai_settings = False
        assistant_profile.view_scope = "all"
        assistant_profile.save()
        assistant_profile.allowed_departments.set(departments)

        created_complaints = 0
        for idx, user in enumerate(seeded_users, start=1):
            for _ in range(complaints_per_citizen):
                template = random.choice(TEXT_TEMPLATES)
                txt = template.format(n=random.randint(2, 200))
                Complaint.objects.create(
                    user=user,
                    text=f"[{user.username}] {txt}",
                    department=random.choice(departments),
                    status=random.choice(STATUSES),
                    confidence=round(random.uniform(0.45, 0.98), 2),
                    used_ai=bool((idx + random.randint(0, 1)) % 2),
                )
                created_complaints += 1

        self.stdout.write(self.style.SUCCESS("✅ Demo seed completed."))
        self.stdout.write(f"Departments total: {Department.objects.count()}")
        self.stdout.write(f"Demo citizens prepared: {len(seeded_users)}")
        self.stdout.write(f"Department staff prepared: {department_staff_count}")
        self.stdout.write("Assistant manager prepared: 1")
        self.stdout.write(f"Complaints created now: {created_complaints}")
        self.stdout.write(f"Login password for demo users: {password}")

    @staticmethod
    def _upsert_user(username, password, first_name, last_name, email, is_staff):
        user, _ = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        user.is_staff = is_staff
        user.is_active = True
        user.save()
        return user