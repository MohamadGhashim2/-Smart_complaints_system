# complaints/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Department
from .ai_classifier import clear_departments_cache

@receiver(post_save, sender=Department)
def on_department_save(sender, instance, **kwargs):
    clear_departments_cache()

@receiver(post_delete, sender=Department)
def on_department_delete(sender, instance, **kwargs):
    clear_departments_cache()
