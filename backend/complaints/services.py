import logging
import os
import threading
from datetime import timedelta

from django.db import close_old_connections, models, transaction
from django.utils import timezone

from users.models import Profile, SystemSettings

from .ai_classifier import classify_department_id
from .ai_summary import summarize_complaint
from .models import Complaint
from .utils import fp_similarity, make_fingerprint

logger = logging.getLogger(__name__)


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def create_complaint_with_ai(serializer, user):
    """
    Fast complaint creation:
    1) Save complaint immediately.
    2) Return response quickly.
    3) Process AI in background.
    """
    with transaction.atomic():
        raw_text = serializer.validated_data.get("text", "") or ""
        fingerprint = make_fingerprint(raw_text)

        initial_status = _initial_status_for_user(user)
        complaint = serializer.save(
            user=user,
            fingerprint=fingerprint or None,
            status=initial_status,
        )

    if _env_bool("COMPLAINT_AI_SYNC", False):
        # Optional mode only; default stays async so citizen request is never blocked by AI latency.
        _run_ai_pipeline_for_complaint(complaint.id)
    else:
        _start_background_ai_pipeline(complaint.id)
    return complaint


def _initial_status_for_user(user):
    # Citizen UX: show "new" immediately on dashboard while AI is processing in background.
    if not user or not user.is_authenticated:
        return "new"

    try:
        profile = user.profile
    except Profile.DoesNotExist:
        profile = None

    role = (profile.role if profile and profile.role else "").lower()
    if role == "citizen" and not user.is_staff:
        return "new"
    return "new"

def _start_background_ai_pipeline(complaint_id):
    t = threading.Thread(
        target=_run_ai_pipeline_for_complaint,
        args=(complaint_id,),
        daemon=True,
        name=f"complaint-ai-{complaint_id}",
    )
    t.start()


def _run_ai_pipeline_for_complaint(complaint_id):
    close_old_connections()
    try:
        with transaction.atomic():
            complaint = (
                Complaint.objects.select_for_update(of=("self",))
                .filter(pk=complaint_id)
                .first()
            )
            if not complaint:
                return

            settings_obj = SystemSettings.get_solo()
            duplicate_threshold = settings_obj.similarity_threshold

            best_existing = _find_best_duplicate_candidate(
                complaint=complaint,
                fingerprint=complaint.fingerprint or "",
            )

            if best_existing and best_existing["similarity"] >= duplicate_threshold:
                base = _inherit_from_duplicate_base(complaint, best_existing["complaint"])
                if base:
                    _finalize_status_after_background_processing(complaint)
                    return

            _apply_ai_enrichment(complaint, settings_obj)
            complaint.base_complaint = None
            complaint.duplicate_index = 0
            _finalize_status_after_background_processing(complaint)
            complaint.save(
                update_fields=[
                    "summary",
                    "department",
                    "confidence",
                    "used_ai",
                    "base_complaint",
                    "duplicate_index",
                    "status",
                ]
            )
    except Exception as exc:
        logger.exception("[Complaint AI] Background processing failed for #%s: %s", complaint_id, exc)
        # لا نتركها معلّقة للأبد بحالة submitted
        Complaint.objects.filter(pk=complaint_id, status="submitted").update(status="new")
    finally:
        close_old_connections()


def _finalize_status_after_background_processing(complaint):
    # Keep "submitted" only when complaint has been routed to a department.
    # If still unrouted after background pass, leave it as "new" for manual handling.
    if complaint.status == "submitted" and complaint.department_id is None:
        complaint.status = "new"


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
    base = Complaint.objects.select_for_update(of=("self",)).filter(pk=base_id).first()
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
    if complaint.department_id and complaint.status == "new":
        complaint.status = "submitted"
    _finalize_status_after_background_processing(complaint)
    complaint.save(
        update_fields=[
            "base_complaint",
            "duplicate_index",
            "used_ai",
            "department",
            "summary",
            "confidence",
            "status",
        ]
    )
    return base


def _apply_ai_enrichment(complaint, settings_obj):
    used_ai = False
    assigned_department = False

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
            assigned_department = True
            used_ai = True
        complaint.confidence = score

    complaint.used_ai = used_ai
    if assigned_department and complaint.status == "new":
        complaint.status = "submitted"