# complaints/ai_classifier.py
import os
from functools import lru_cache
from transformers import pipeline

MODEL_NAME = os.getenv("ZSC_MODEL", "joeddav/xlm-roberta-large-xnli")

CANDIDATE_LABELS = [
    "Sağlık Bakanlığı",
    "Milli Eğitim Bakanlığı",
    "Belediye",
]

LABEL_TO_CODE = {
    "Sağlık Bakanlığı": "HEALTH",
    "Milli Eğitim Bakanlığı": "EDU",
    "Belediye": "MUNIC",
}

# استخدم {} (positional) وليس {label}
HYPOTHESIS_TEMPLATES = [
    "Bu şikayet {} ile ilgilidir.",      # TR
    "هذه الشكوى تتعلق بـ {}.",           # AR
    "This complaint is related to {}.",  # EN
]

@lru_cache(maxsize=1)
def _get_pipeline():
    return pipeline("zero-shot-classification", model=MODEL_NAME)

def classify_department_label(text: str, multi_label: bool = False):
    zsc = _get_pipeline()
    best = (None, 0.0)
    for hypo in HYPOTHESIS_TEMPLATES:
        res = zsc(
            sequences=text,
            candidate_labels=CANDIDATE_LABELS,
            multi_label=multi_label,
            hypothesis_template=hypo,
        )
        labels = res["labels"]
        scores = res["scores"]
        if scores[0] > best[1]:
            best = (labels[0], float(scores[0]))
    return best

def classify_department_code(text: str, min_score: float = 0.55):
    label, score = classify_department_label(text)
    if label is None or score < min_score:
        return None, float(score or 0.0)
    return LABEL_TO_CODE.get(label), float(score)
