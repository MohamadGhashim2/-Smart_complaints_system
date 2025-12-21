from django.urls import path
from .views import (
    ComplaintListCreateView,
    DepartmentListCreateView,
    DepartmentDetailView,
    ComplaintFormPage,
)
from .auth_views import MeView

urlpatterns = [
    path("complaints/", ComplaintListCreateView.as_view(), name="complaints-list-create"),

    path("departments/", DepartmentListCreateView.as_view(), name="departments-list-create"),
    path("departments/<int:pk>/", DepartmentDetailView.as_view(), name="departments-detail"),

    path("complaints/form/", ComplaintFormPage.as_view(), name="complaints-form"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
]