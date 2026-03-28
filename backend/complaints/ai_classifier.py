# complaints/ai_classifier.py
import os
import json
from functools import lru_cache

from openai import OpenAI
from .models import Department
import logging

logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv(
    "OPENAI_CLASSIFIER_MODEL",
    os.getenv("OPENAI_CHEAP_MODEL", "gpt-5-nano"),
)


@lru_cache(maxsize=1)
def _get_client() -> OpenAI | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("[AI-CLS] OPENAI_API_KEY is NOT set. Skipping AI.")
        return None
    logger.info("[AI-CLS] OpenAI client initialized with model %s", MODEL_NAME)
    return OpenAI(api_key=api_key)


@lru_cache(maxsize=1)
def _get_departments_cache():
    deps = list(Department.objects.values("id", "name_tr", "name_ar", "code"))
    logger.info("[AI-CLS] Loaded %d departments into cache.", len(deps))
    return deps


def clear_departments_cache():
    _get_departments_cache.cache_clear()
    logger.info("[AI-CLS] Departments cache cleared.")


def classify_department_id(text: str, min_score: float = 0.55):
    deps = _get_departments_cache()
    if not deps:
        logger.warning("[AI-CLS] No departments found; cannot classify.")
        return None, 0.0

    client = _get_client()
    if client is None:
        return None, 0.0

    departments_json = json.dumps(deps, ensure_ascii=False)
    logger.info("[AI-CLS] Classifying complaint: %.40r...", text)

    system_msg = (
        "You are a routing component in a Turkish e-government complaints system. "
        "You must choose the single best ministry/department for each complaint "
        "from the provided list of departments."
    )

    user_msg = f"""
Departments (JSON array):
{departments_json}

Complaint text (could be Turkish or Arabic or English):
\"\"\"{text}\"\"\"

Return ONLY a JSON object with:
- "department_id": the integer id from the list above, or null if none are appropriate
- "confidence": a float between 0.0 and 1.0
"""

    try:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
           
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content
        logger.info("[AI-CLS] Raw response: %s", raw)
        data = json.loads(raw)

        dept_id = data.get("department_id")
        confidence = float(data.get("confidence", 0.0))
    except Exception as e:
        logger.exception("[AI-CLS] Error while calling OpenAI: %s", e)
        return None, 0.0

    if dept_id is None:
        logger.info("[AI-CLS] Model returned department_id=None (confidence=%.3f)", confidence)
        return None, confidence

    if not any(d["id"] == dept_id for d in deps):
        logger.warning("[AI-CLS] Model returned invalid department_id=%r", dept_id)
        return None, confidence

    if confidence < min_score:
        logger.info("[AI-CLS] Confidence %.3f < min_score %.3f -> ignoring dept.", confidence, min_score)
        return None, confidence

    logger.info("[AI-CLS] Classified into dept_id=%s with confidence=%.3f", dept_id, confidence)
    return int(dept_id), confidence
