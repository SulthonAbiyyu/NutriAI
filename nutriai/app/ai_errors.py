import re
from flask import current_app


def friendly_ai_error(exc, tag='AI'):
    # Detail asli HANYA masuk log server (untuk developer), tidak dikirim ke user.
    raw = str(exc)
    current_app.logger.error(f'[{tag}] AI error: {raw[:500]}', exc_info=True)

    m = re.search(r'HTTP(?: error)?\s+(\d{3})', raw)
    code = int(m.group(1)) if m else None
    low = raw.lower()

    if code == 429 or 'quota' in low or 'resource_exhausted' in low:
        return 'Jarvis lagi ramai nih 😅 Coba lagi dalam beberapa menit ya.'
    if code in (500, 502, 503, 504):
        return 'Jarvis lagi istirahat sebentar. Coba lagi sebentar lagi ya.'
    if 'timed out' in low or 'koneksi' in low or 'urlopen' in low:
        return 'Koneksi Jarvis lagi kurang stabil. Coba lagi ya 🙏'
    return 'Ups, Jarvis lagi bermasalah. Coba lagi nanti ya 🙏'
