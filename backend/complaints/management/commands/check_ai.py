import os

from django.core.management.base import BaseCommand

from complaints.ai_classifier import MODEL_NAME, classify_department_id
from complaints.ai_summary import OPENAI_MODEL_SUMMARY, summarize_complaint
from complaints.models import Department
from users.models import SystemSettings


class Command(BaseCommand):
    help = "Check AI readiness (env, settings, and optional live OpenAI call) without creating complaints."

    def add_arguments(self, parser):
        parser.add_argument(
            "--text",
            type=str,
            default="Mahallede çöp konteynerleri taşmış ve uzun süredir toplanmıyor.",
            help="Sample complaint text used for AI checks.",
        )
        parser.add_argument(
            "--skip-live-call",
            action="store_true",
            help="Only print config readiness without calling OpenAI.",
        )

    def handle(self, *args, **options):
        sample_text = options["text"]
        skip_live = options["skip_live_call"]

        settings_obj = SystemSettings.get_solo()
        deps_count = Department.objects.count()

        key_openai = bool(os.getenv("OPENAI_API_KEY"))
        key_gopenai = bool(os.getenv("GOPENAI_API_KEY"))
        any_key = key_openai or key_gopenai

        self.stdout.write("=== AI Readiness Check ===")
        self.stdout.write(f"OPENAI_API_KEY set: {key_openai}")
        self.stdout.write(f"GOPENAI_API_KEY set: {key_gopenai}")
        self.stdout.write(f"Any API key set: {any_key}")
        self.stdout.write(f"Summary model: {OPENAI_MODEL_SUMMARY!r}")
        self.stdout.write(f"Classifier model: {MODEL_NAME!r}")
        self.stdout.write(f"Departments count: {deps_count}")
        self.stdout.write(f"use_ai_summary: {settings_obj.use_ai_summary}")
        self.stdout.write(f"use_ai_routing: {settings_obj.use_ai_routing}")
        self.stdout.write(f"ai_min_confidence: {settings_obj.ai_min_confidence}")
        if not OPENAI_MODEL_SUMMARY or not MODEL_NAME:
            self.stdout.write(
                self.style.WARNING(
                    "Model name is empty. Set OPENAI_CHEAP_MODEL or specific OPENAI_*_MODEL values."
                )
            )
        if skip_live:
            self.stdout.write(self.style.WARNING("Skipped live OpenAI call (--skip-live-call)."))
            return

        self.stdout.write("\n=== Live AI Probe (no DB writes) ===")
        self.stdout.write(f"Sample text: {sample_text}")

        summary = summarize_complaint(sample_text)
        dep_id, confidence = classify_department_id(
            sample_text,
            min_score=settings_obj.ai_min_confidence,
        )

        self.stdout.write(f"Summary returned: {bool(summary)}")
        if summary:
            self.stdout.write(f"Summary: {summary}")

        self.stdout.write(f"Classified department_id: {dep_id}")
        self.stdout.write(f"Classification confidence: {confidence}")

        if summary or dep_id:
            self.stdout.write(self.style.SUCCESS("AI appears to be working."))
        else:
            self.stdout.write(
                self.style.WARNING(
                    "AI returned no enrichment. Check keys, settings, logs, and department data."
                )
            )