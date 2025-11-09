from django.db import models
from django.contrib.auth.models import User

class Department(models.Model):
    name_tr = models.CharField(max_length=120, unique=True)
    name_ar = models.CharField(max_length=120, blank=True, null=True)
    code    = models.CharField(max_length=40, unique=True)

    def __str__(self):
        return self.name_tr

class Complaint(models.Model):
    STATUS_CHOICES = [
        ("new", "Yeni"),
        ("in_review", "İncelemede"),
        ("closed", "Kapandı"),
    ]

    user        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    text        = models.TextField()
    summary     = models.TextField(blank=True, null=True)  # سنتركه فارغ الآن
    department  = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    created_at  = models.DateTimeField(auto_now_add=True)
    confidence  = models.FloatField(null=True, blank=True)  # NEW

    def __str__(self):
        return f"Complaint #{self.id} - {self.status}"
