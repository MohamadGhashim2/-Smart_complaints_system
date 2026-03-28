# complaints/urls.py
from django.urls import path
from .views import (
    ComplaintListCreateView,
    ComplaintDetailView,
    DepartmentListCreateView,
    DepartmentDetailView,
    ComplaintFormPage,
)

urlpatterns = [
    path("complaints/", ComplaintListCreateView.as_view(), name="complaints-list-create"),
    path("complaints/<int:pk>/", ComplaintDetailView.as_view(), name="complaints-detail"),

    path("departments/", DepartmentListCreateView.as_view(), name="departments-list-create"),
    path("departments/<int:pk>/", DepartmentDetailView.as_view(), name="departments-detail"),

    path("complaints/form/", ComplaintFormPage.as_view(), name="complaints-form"),

    
]
