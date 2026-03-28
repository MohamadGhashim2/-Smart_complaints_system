# core/views.py
from django.http import JsonResponse
from django.views.generic import TemplateView
from django.views import View


class HomePage(TemplateView):
    template_name = "home.html"


class HealthCheckView(View):
    def get(self, request):
        return JsonResponse(
            {
                "success": True,
                "data": {
                    "service": "smart-complaints-api",
                    "status": "ok",
                    "version": "v1",
                },
            }
        )