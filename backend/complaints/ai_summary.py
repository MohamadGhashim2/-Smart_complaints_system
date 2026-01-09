# complaints/ai_summary.py
import os
from functools import lru_cache
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)

OPENAI_MODEL_SUMMARY = os.getenv("OPENAI_SUMMARY_MODEL", "gpt-5-nano")


@lru_cache(maxsize=1)
def _get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("[AI-SUMMARY] OPENAI_API_KEY is NOT set. Skipping AI.")
        return None
    logger.info("[AI-SUMMARY] OpenAI client initialized with model %s", OPENAI_MODEL_SUMMARY)

    return OpenAI(api_key=api_key)


def summarize_complaint(text: str, max_chars: int = 260):
    if not text:
        return None

    client = _get_client()
    if client is None:
        return None

    logger.info("[AI-SUMMARY] Calling OpenAI for complaint text: %.40r...", text)

    user_prompt = (
        "Şu vatandaş şikayetini özetle.\n"
        "Şikayet Türkçe veya Arapça olabilir.\n"
        "Sadece nötr ve kısa bir özet yaz, TÜRKÇE olarak.\n"
        f"Maksimum uzunluk: {max_chars} karakter.\n"
        "Bakanlık / kurum isimlerini koru. Tavsiye ekleme.\n\n"
        f"Şikayet metni:\n{text}"
    )

    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL_SUMMARY,
            messages=[
                {
                    "role": "system",
                    "content": "You create very short, neutral summaries of citizen complaints in Turkish.",
                },
                {"role": "user", "content": user_prompt},
            ],
            
        )
        summary = resp.choices[0].message.content.strip()
        logger.info("[AI-SUMMARY] Got summary: %.60r", summary)
        return summary
    except Exception as e:
        logger.exception("[AI-SUMMARY] Error while calling OpenAI: %s", e)
        return None
