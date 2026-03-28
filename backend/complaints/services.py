from datetime import timedelta

from django.db import models, transaction
from django.utils import timezone

from users.models import SystemSettings

from .ai_classifier import classify_department_id
from .ai_summary import summarize_complaint
from .models import Complaint
from .utils import fp_similarity, make_fingerprint


def create_complaint_with_ai(serializer, user):
    """
    Enterprise complaint creation flow:
    - ACID-safe transaction.
    - duplicate detection from recent complaints.
    - AI summarization / routing controlled by SystemSettings.
    """
    with transaction.atomic():
        settings_obj = SystemSettings.get_solo()

        raw_text = serializer.validated_data.get("text", "") or ""
        fingerprint = make_fingerprint(raw_text)

        complaint = serializer.save(
            user=user,
            fingerprint=fingerprint or None,
        )

        duplicate_threshold = settings_obj.similarity_threshold
        best_existing = _find_best_duplicate_candidate(
            complaint=complaint,
            fingerprint=fingerprint,
        )

        if best_existing and best_existing["similarity"] >= duplicate_threshold:
            base = _inherit_from_duplicate_base(complaint, best_existing["complaint"])
            if base:
                return complaint

        _apply_ai_enrichment(complaint, settings_obj)
        complaint.base_complaint = None
        complaint.duplicate_index = 0
        complaint.save(
            update_fields=[
                "summary",
                "department",
                "confidence",
                "used_ai",
                "base_complaint",
                "duplicate_index",
            ]
        )
        return complaint


def _find_best_duplicate_candidate(complaint, fingerprint):
    if not fingerprint:
        return None

    recent_since = timezone.now() - timedelta(days=2)
    existing_qs = (
        Complaint.objects.select_related("department", "base_complaint")
        .exclude(pk=complaint.pk)
        .exclude(fingerprint__isnull=True)
        .exclude(fingerprint__exact="")
        .filter(
            models.Q(department__isnull=False)
            | models.Q(summary__isnull=False)
            | models.Q(confidence__isnull=False),
            created_at__gte=recent_since,
        )
    )

    best_existing = None
    best_similarity = 0.0
    for other in existing_qs.iterator(chunk_size=200):
        similarity = fp_similarity(fingerprint, other.fingerprint or "")
        if similarity > best_similarity:
            best_similarity = similarity
            best_existing = other

    if not best_existing:
        return None

    return {"complaint": best_existing, "similarity": best_similarity}


def _inherit_from_duplicate_base(complaint, candidate):
    base_id = candidate.base_complaint_id or candidate.id
    base = Complaint.objects.select_for_update().filter(pk=base_id).first()
    if not base:
        return None

    if not (base.department_id or base.summary or base.confidence is not None):
        return None

    existing_dup_count = Complaint.objects.filter(base_complaint=base).count()

    complaint.base_complaint = base
    complaint.duplicate_index = existing_dup_count + 1
    complaint.used_ai = False
    complaint.department = base.department
    complaint.summary = base.summary
    complaint.confidence = base.confidence
    complaint.save(
        update_fields=[
            "base_complaint",
            "duplicate_index",
            "used_ai",
            "department",
            "summary",
            "confidence",
        ]
    )
    return base


def _apply_ai_enrichment(complaint, settings_obj):
    used_ai = False

    if settings_obj.use_ai_summary and complaint.text and not complaint.summary:
        summary = summarize_complaint(complaint.text)
        if summary:
            complaint.summary = summary
            used_ai = True

    if settings_obj.use_ai_routing and complaint.text and complaint.department_id is None:
        department_id, score = classify_department_id(
            complaint.text,
            min_score=settings_obj.ai_min_confidence,
        )
        if department_id:
            complaint.department_id = department_id
            used_ai = True
        complaint.confidence = score

    complaint.used_ai = used_ai