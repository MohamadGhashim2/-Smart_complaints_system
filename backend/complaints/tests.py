from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase

from complaints.models import Complaint, Department
from complaints.services import create_complaint_with_ai
from complaints.serializers import ComplaintSerializer
from users.models import SystemSettings


class ComplaintCreationServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="citizen_1",
            password="strong-pass-123",
        )
        self.department = Department.objects.create(
            name_tr="Ulaşım",
            name_ar="النقل",
            code="ULS",
        )
        self.settings = SystemSettings.get_solo()
        self.settings.use_ai_summary = True
        self.settings.use_ai_routing = True
        self.settings.similarity_threshold = 0.7
        self.settings.ai_min_confidence = 0.5
        self.settings.save()

    @patch("complaints.services.classify_department_id")
    @patch("complaints.services.summarize_complaint")
    def test_create_complaint_applies_ai_when_enabled(self, mock_summarize, mock_classify):
        mock_summarize.return_value = "ملخص تلقائي"
        mock_classify.return_value = (self.department.id, 0.92)

        serializer = ComplaintSerializer(data={"text": "ازدحام شديد في الحي"})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        complaint = create_complaint_with_ai(serializer=serializer, user=self.user)
        complaint.refresh_from_db()

        self.assertEqual(complaint.summary, "ملخص تلقائي")
        self.assertEqual(complaint.department_id, self.department.id)
        self.assertEqual(complaint.confidence, 0.92)
        self.assertTrue(complaint.used_ai)
        self.assertEqual(complaint.duplicate_index, 0)
        self.assertIsNone(complaint.base_complaint_id)

    @patch("complaints.services.classify_department_id")
    @patch("complaints.services.summarize_complaint")
    @patch("complaints.services.fp_similarity")
    def test_create_complaint_inherits_from_duplicate_base(
        self,
        mock_similarity,
        mock_summarize,
        mock_classify,
    ):
        mock_similarity.return_value = 0.95
        mock_summarize.return_value = "لا يجب استخدام AI في هذا السيناريو"
        mock_classify.return_value = (self.department.id, 0.99)

        base = Complaint.objects.create(
            user=self.user,
            text="ازدحام شديد في الحي",
            summary="ملخص قديم",
            department=self.department,
            confidence=0.88,
            fingerprint="seed-fp",
            used_ai=True,
        )

        serializer = ComplaintSerializer(data={"text": "ازدحام شديد في الحي"})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        complaint = create_complaint_with_ai(serializer=serializer, user=self.user)
        complaint.refresh_from_db()

        self.assertEqual(complaint.base_complaint_id, base.id)
        self.assertEqual(complaint.summary, "ملخص قديم")
        self.assertEqual(complaint.department_id, self.department.id)
        self.assertEqual(complaint.confidence, 0.88)
        self.assertFalse(complaint.used_ai)
        mock_summarize.assert_not_called()
        mock_classify.assert_not_called()

    @patch("complaints.services.classify_department_id")
    @patch("complaints.services.summarize_complaint")
    def test_create_complaint_skips_ai_when_disabled(self, mock_summarize, mock_classify):
        self.settings.use_ai_summary = False
        self.settings.use_ai_routing = False
        self.settings.save(update_fields=["use_ai_summary", "use_ai_routing"])

        serializer = ComplaintSerializer(data={"text": "إنارة الشارع لا تعمل"})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        complaint = create_complaint_with_ai(serializer=serializer, user=self.user)
        complaint.refresh_from_db()

        self.assertFalse(complaint.used_ai)
        self.assertIsNone(complaint.summary)
        self.assertIsNone(complaint.department_id)
        self.assertIsNone(complaint.confidence)
        mock_summarize.assert_not_called()
        mock_classify.assert_not_called()