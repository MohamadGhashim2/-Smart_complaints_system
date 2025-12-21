# complaints/utils.py
import re
import unicodedata

def make_fingerprint(text: str) -> str:
    """
    نعمل بصمة بسيطة للنص:
    - lowercase
    - إزالة التشكيل
    - إزالة الرموز وعلامات الترقيم
    - تقسيم لكلمات
    - إزالة التكرار + ترتيب
    - أخذ أول 20 كلمة
    تشتغل مع العربي + التركي + الإنكليزي.
    """
    if not text:
        return ""

    # lower
    t = text.lower()

    # إزالة التشكيل
    t = unicodedata.normalize("NFKD", t)
    t = "".join(ch for ch in t if not unicodedata.combining(ch))

    # نسمح بحروف وأرقام وكمان العربي
    t = re.sub(r"[^\w\u0600-\u06FF]+", " ", t, flags=re.UNICODE)

    words = t.split()
    if not words:
        return ""

    unique = sorted(set(words))
    return " ".join(unique[:20])


def fp_similarity(fp1: str, fp2: str) -> float:
    """
    قياس تشابه Jaccard بين بصمتين (0.0 - 1.0)
    """
    if not fp1 or not fp2:
        return 0.0

    s1 = set(fp1.split())
    s2 = set(fp2.split())
    if not s1 or not s2:
        return 0.0

    inter = len(s1 & s2)
    union = len(s1 | s2)
    if union == 0:
        return 0.0

    return inter / union
