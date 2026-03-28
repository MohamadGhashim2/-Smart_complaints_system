from django.test import SimpleTestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from core.exceptions import unified_exception_handler


class _ValidationErrorView(APIView):
    def get(self, request):
        raise ValidationError({"field": ["invalid"]})


class UnifiedExceptionHandlerTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_unified_exception_shape(self):
        request = self.factory.get("/api/v1/test/")
        view = _ValidationErrorView.as_view()
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("success", response.data)
        self.assertFalse(response.data["success"])
        self.assertIn("error", response.data)
        self.assertIn("details", response.data["error"])

    def test_handler_direct_call(self):
        request = self.factory.get("/api/v1/sample/")
        exc = ValidationError({"field": ["invalid"]})
        response = unified_exception_handler(exc, {"request": request})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["meta"]["path"], "/api/v1/sample/")


class HealthCheckTests(SimpleTestCase):
    def test_health_endpoint(self):
        response = self.client.get(reverse("health-check"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "ok")