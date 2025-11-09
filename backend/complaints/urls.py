from django.urls import path
from .views import ComplaintListCreateView, DepartmentListView, ComplaintFormPage  # <-- مهم
urlpatterns = [
    path("complaints/", ComplaintListCreateView.as_view(), name="complaints-list-create"),
    path("departments/", DepartmentListView.as_view(), name="departments-list"),
    path("complaints/form/", ComplaintFormPage.as_view(), name="complaints-form"),  # <— الصفحة

]
