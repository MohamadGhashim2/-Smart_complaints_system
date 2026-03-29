    import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update a superuser from environment variables (idempotent)."

    def handle(self, *args, **options):
        username = (
            os.getenv("ADMIN_USERNAME")
            or os.getenv("DJANGO_SUPERUSER_USERNAME")
            or ""
        ).strip()
        password = (
            os.getenv("ADMIN_PASSWORD")
            or os.getenv("DJANGO_SUPERUSER_PASSWORD")
            or ""
        ).strip()
        email = (
            os.getenv("ADMIN_EMAIL")
            or os.getenv("DJANGO_SUPERUSER_EMAIL")
            or "admin@example.com"
        ).strip()

        if not username or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Skipped ensure_admin: set ADMIN_USERNAME + ADMIN_PASSWORD "
                    "(or DJANGO_SUPERUSER_USERNAME + DJANGO_SUPERUSER_PASSWORD)."
                )
            )
            return

        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "is_staff": True, "is_superuser": True},
        )

        changed = False
        if user.email != email:
            user.email = email
            changed = True
        if not user.is_staff:
            user.is_staff = True
            changed = True
        if not user.is_superuser:
            user.is_superuser = True
            changed = True

        user.set_password(password)
        changed = True

        if changed:
            user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created admin user: {username}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated admin user: {username}"))