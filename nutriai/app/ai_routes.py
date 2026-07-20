import os
import re
import json
import time
import urllib.request as urlreq
import urllib.error   as urlerr
from collections import defaultdict
from datetime import timedelta

from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models import (
    db, User, Food, WaktuMakan, Laporan,
    WeightHistory, WaterLog, MealTemplate, StreakLog,
    now_utc,
)
from app.routes import (
    get_current_user, get_targets, hitung_bmr_tdee,
    record_streak, calc_streak,
)

ai_bp = Blueprint('ai', __name__)

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')


# ─────────────────────────────────────────────────────────
#  CORE GEMINI HELPER
# ─────────────────────────────────────────────────────────

def call_gemini(prompt: str, image_base64: str = None) -> dict:
    """
    Panggil Gemini API dengan retry otomatis.
    Return dict dengan 'text' dan 'tts_text' (bersih untuk TTS).
    """
    if not GEMINI_API_KEY:
        raise RuntimeError('GEMINI_API_KEY belum diset di file .env')

    model    = os.environ.get('GEMINI_MODEL',   'gemini-2.5-flash-preview-04-17')
    api_ver  = os.environ.get('GEMINI_API_VER', 'v1alpha')
    endpoint = (
        f'https://generativelanguage.googleapis.com/{api_ver}'
        f'/models/{model}:generateContent?key={GEMINI_API_KEY}'
    )

    parts = [{'text': prompt}]
    if image_base64:
        parts.append({'inline_data': {'mime_type': 'image/jpeg', 'data': image_base64}})

    payload = json.dumps({
        'contents': [{'parts': parts}],
        # FIX: model gemini-2.5-flash (termasuk varian -preview) punya "thinking"
        # (internal reasoning) yang NYALA SECARA DEFAULT, dan token buat mikir itu
        # ikut dipotong dari maxOutputTokens — bukan budget terpisah. Dengan
        # maxOutputTokens cuma 1024, proses mikirnya bisa makan hampir semua
        # budget, jadi jawaban yang beneran ditulis kepotong di tengah kalimat
        # (mis. "sisa target ... kcal" putus, atau list "5 rekomendasi" cuma
        # kebagian 1). thinkingBudget: 0 matiin proses mikir itu (gak perlu buat
        # chat nutrisi/saran menu yang sifatnya singkat & langsung), dan
        # maxOutputTokens dinaikkan sebagai jaga-jaga.
        # CATATAN: thinkingBudget: 0 cuma didukung model Flash. Kalau GEMINI_MODEL
        # di .env diganti ke model Pro, ganti nilainya ke minimal 128 (Pro selalu
        # butuh sedikit "thinking", gak bisa 0).
        'generationConfig': {
            'temperature':      0.7,
            'maxOutputTokens':  2048,
            'thinkingConfig':   {'thinkingBudget': 0},
        },
    }).encode()

    RETRY_DELAYS = [2, 5, 10]
    gemini_result = None
    last_error    = None

    for attempt in range(3):
        try:
            req = urlreq.Request(endpoint, data=payload, headers={'Content-Type': 'application/json'})
            with urlreq.urlopen(req, timeout=55) as resp:
                gemini_result = json.loads(resp.read())
            break

        except urlerr.HTTPError as http_err:
            err_body   = http_err.read().decode('utf-8', errors='replace')
            last_error = f'HTTP error {http_err.code}: {err_body[:300]}'
            if http_err.code in (503, 429, 500) and attempt < 2:
                time.sleep(RETRY_DELAYS[attempt])
                continue
            raise RuntimeError(f'Gemini HTTP {http_err.code}: {err_body[:300]}')

        except urlerr.URLError as url_err:
            last_error = str(url_err)
            if attempt < 2:
                time.sleep(RETRY_DELAYS[attempt])
                continue
            raise RuntimeError(f'Gemini koneksi gagal: {str(url_err.reason)}')

    if gemini_result is None:
        raise RuntimeError(last_error or 'Semua retry gagal')

    try:
        raw_text = gemini_result['candidates'][0]['content']['parts'][0]['text']
    except (KeyError, IndexError):
        raise RuntimeError(f'Gemini response tidak valid: {str(gemini_result)[:200]}')

    tts_text = re.sub(r'[*_`#\-•]', '', raw_text)
    tts_text = re.sub(r'[\U00010000-\U0010ffff]', '', tts_text, flags=re.UNICODE)
    tts_text = re.sub(r'\s+', ' ', tts_text).strip()

    return {'text': raw_text, 'tts_text': tts_text}


# ─────────────────────────────────────────────────────────
#  DEBUG ENDPOINTS
# ─────────────────────────────────────────────────────────

@ai_bp.route('/api/ai/test', methods=['GET'])
def ai_test():
    """Cek apakah Gemini bisa dipanggil."""
    key = os.environ.get('GEMINI_API_KEY', '')
    if not key:
        return jsonify({
            'status':  'ERROR',
            'masalah': 'GEMINI_API_KEY tidak ditemukan di .env',
            'solusi':  'Tambahkan GEMINI_API_KEY=AIza... di file .env',
        }), 200

    model    = os.environ.get('GEMINI_MODEL',   'gemini-2.5-flash-preview-04-17')
    api_ver  = os.environ.get('GEMINI_API_VER', 'v1alpha')
    endpoint = f'https://generativelanguage.googleapis.com/{api_ver}/models/{model}:generateContent?key={key}'
    payload  = json.dumps({
        'contents': [{'parts': [{'text': 'Halo, jawab dengan satu kata: OK'}]}]
    }).encode()

    try:
        req = urlreq.Request(endpoint, data=payload, headers={'Content-Type': 'application/json'})
        with urlreq.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            text   = result['candidates'][0]['content']['parts'][0]['text']
            return jsonify({'status': 'OK', 'model': model, 'key_prefix': key[:8] + '...', 'gemini_reply': text}), 200
    except urlerr.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        return jsonify({'status': 'ERROR', 'http_code': e.code, 'error_detail': body[:500], 'key_prefix': key[:8] + '...'}), 200
    except urlerr.URLError as e:
        return jsonify({'status': 'ERROR', 'masalah': 'Tidak bisa konek ke Gemini API', 'detail': str(e.reason)}), 200
    except Exception as e:
        return jsonify({'status': 'ERROR', 'detail': str(e)}), 200


@ai_bp.route('/api/ai/debug', methods=['GET'])
def ai_debug():
    """ListModels lalu coba satu per satu sampai berhasil."""
    key = GEMINI_API_KEY
    if not key:
        return jsonify({'status': 'ERROR', 'masalah': 'GEMINI_API_KEY kosong di .env'}), 200

    available_models = []
    try:
        list_url  = f'https://generativelanguage.googleapis.com/v1beta/models?key={key}'
        req_list  = urlreq.Request(list_url)
        with urlreq.urlopen(req_list, timeout=10) as r:
            models_data = json.loads(r.read())
            for m in models_data.get('models', []):
                if 'generateContent' in m.get('supportedGenerationMethods', []):
                    available_models.append(m['name'].replace('models/', ''))
    except Exception as le:
        return jsonify({'status': 'ERROR', 'error': f'ListModels gagal: {str(le)}'}), 200

    if not available_models:
        return jsonify({'status': 'ERROR', 'error': 'Tidak ada model tersedia untuk key ini'}), 200

    payload = json.dumps({'contents': [{'parts': [{'text': 'Halo, balas dengan: OK'}]}]}).encode()
    results = []
    for model in available_models:
        for api_ver in ['v1beta', 'v1']:
            url = f'https://generativelanguage.googleapis.com/{api_ver}/models/{model}:generateContent?key={key}'
            req = urlreq.Request(url, data=payload, headers={'Content-Type': 'application/json'})
            try:
                with urlreq.urlopen(req, timeout=10) as resp:
                    r    = json.loads(resp.read())
                    text = r['candidates'][0]['content']['parts'][0]['text']
                    return jsonify({
                        'status':     '✅ BERHASIL',
                        'model':      model,
                        'api_ver':    api_ver,
                        'response':   text[:80],
                        'TINDAKAN':   'Tambahkan 2 baris ini ke .env backend lalu restart Flask:',
                        'ENV_LINE_1': f'GEMINI_MODEL={model}',
                        'ENV_LINE_2': f'GEMINI_API_VER={api_ver}',
                    }), 200
            except urlerr.HTTPError as e:
                body = e.read().decode('utf-8', errors='replace')[:80]
                results.append({'model': model, 'api_ver': api_ver, 'code': e.code, 'err': body})
                if e.code == 429:
                    break
            except Exception as e:
                results.append({'model': model, 'err': str(e)[:60]})

    return jsonify({'status': '❌ SEMUA GAGAL', 'model_yg_dicoba': results, 'semua_model_list': available_models}), 200


# ─────────────────────────────────────────────────────────
#  AI ENDPOINTS
# ─────────────────────────────────────────────────────────

@ai_bp.route('/api/ai/meal-suggestion', methods=['GET'])
@jwt_required()
def ai_meal_suggestion():
    """Saran menu berdasarkan sisa kalori & protein hari ini."""
    user  = get_current_user()
    today = (now_utc() + timedelta(hours=7)).date()  # FIX: pakai tanggal WIB, bukan UTC
    entries = WaktuMakan.query.filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == today,
        WaktuMakan.deleted_at.is_(None),
    ).all()

    total_protein            = sum((e.protein or 0) for e in entries)
    total_kalori             = sum((e.kalori  or 0) for e in entries)
    target_cal, target_prot  = get_targets(user)
    sisa_kal                 = max(target_cal  - total_kalori,  0)
    sisa_prot                = max(target_prot - total_protein, 0)

    prompt = (
        f"Kamu adalah asisten nutrisi. User memiliki tujuan diet {user.tujuan}, "
        f"berat {user.bb}kg, tinggi {user.tb}cm, aktivitas {user.aktivitas}. "
        f"Hari ini sudah makan {total_kalori} kcal ({total_protein}g protein). "
        f"Sisa target: {sisa_kal} kcal dan {sisa_prot}g protein. "
        f"Berikan 3 saran menu makanan Indonesia yang mudah didapat untuk memenuhi sisa target. "
        f"Format singkat dan praktis dalam Bahasa Indonesia. "
        f"JANGAN pakai markdown (tanpa tanda bintang **, tanpa #, tanpa garis bawah _) karena teks "
        f"ditampilkan apa adanya di app. Format list bernomor PERSIS begini: "
        f"'1. nama_menu = penjelasan singkat', '2. nama_menu = penjelasan singkat', dst."
    )

    try:
        result = call_gemini(prompt)
        return jsonify({
            'suggestion': result['text'],
            'tts_text':   result['tts_text'],
            'context':    {'sisa_kalori': sisa_kal, 'sisa_protein': sisa_prot},
        }), 200
    except Exception as e:
        return jsonify({'error': f'AI error: {str(e)}'}), 503


@ai_bp.route('/api/ai/analyze-image', methods=['POST'])
@jwt_required()
def ai_analyze_image():
    """Analisis foto makanan → estimasi kalori & protein."""
    import base64

    image_b64 = None
    if 'image' in request.files:
        image_b64 = base64.b64encode(request.files['image'].read()).decode('utf-8')
    elif request.is_json:
        image_b64 = (request.get_json() or {}).get('image_base64')

    if not image_b64:
        return jsonify({'error': 'Gambar wajib dikirim'}), 400

    prompt = (
        "Analisis foto makanan ini. Identifikasi makanan yang terlihat dan estimasikan "
        "kandungan nutrisi per porsi dalam Bahasa Indonesia. "
        "Jawab HANYA dalam format JSON seperti ini (tanpa markdown): "
        '{"nama_makanan": "...", "estimasi_kalori": 0, "estimasi_protein": 0, '
        '"estimasi_karbo": 0, "estimasi_lemak": 0, "catatan": "..."}'
    )

    try:
        result   = call_gemini(prompt, image_b64)
        raw_text = re.sub(r'```json|```', '', result['text'].strip()).strip()
        nutrisi  = json.loads(raw_text)
        return jsonify({
            'result':   nutrisi,
            'tts_text': (
                f"Makanan terdeteksi: {nutrisi.get('nama_makanan','tidak diketahui')}. "
                f"Estimasi kalori {nutrisi.get('estimasi_kalori', 0)} kilokalori, "
                f"protein {nutrisi.get('estimasi_protein', 0)} gram."
            ),
        }), 200
    except json.JSONDecodeError:
        return jsonify({'result': None, 'raw': result['text'], 'tts_text': result['tts_text']}), 200
    except Exception as e:
        return jsonify({'error': f'AI error: {str(e)}'}), 503


@ai_bp.route('/api/ai/chat', methods=['POST'])
@jwt_required()
def ai_chat():
    """Tanya jawab nutrisi personal dengan riwayat percakapan."""
    user = get_current_user()
    data = request.get_json() or {}
    msg  = (data.get('message') or '').strip()

    if not msg:
        return jsonify({'error': 'Pesan tidak boleh kosong'}), 400

    today = (now_utc() + timedelta(hours=7)).date()  # FIX: pakai tanggal WIB, bukan UTC
    target_cal, target_prot = get_targets(user)

    # Status hari ini untuk konteks
    entries_today = WaktuMakan.query.filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == today,
        WaktuMakan.deleted_at.is_(None),
    ).all()
    total_kal_chat  = sum(e.kalori  or 0 for e in entries_today)
    total_prot_chat = sum(e.protein or 0 for e in entries_today)
    makanan_chat    = ', '.join(e.nama_makanan or '?' for e in entries_today) or 'belum ada'

    system_context = (
        f"Kamu adalah NutriAI, asisten nutrisi personal yang cerdas, hangat, dan peka konteks. "
        f"Berbicara seperti teman yang peduli — tidak kaku, tetapi tetap akurat dan informatif. "
        f"SELALU jawab dalam Bahasa Indonesia yang natural. Gunakan nama user sesekali.\n\n"
        f"GAYA JAWABAN (PENTING):\n"
        f"- Langsung ke inti jawaban. Buang basa-basi dan jangan ulang-ulang info yang gak ditanya user.\n"
        f"- Jangan otomatis nyebut status hari ini (kalori/protein sudah makan berapa) kecuali memang relevan "
        f"sama pertanyaan atau user memang nanya soal progress/statusnya.\n"
        f"- Kalau user tanya penilaian (worth it/gak, sehat/gak, boleh/gak, cukup/gak), pakai pola singkat: "
        f"kesimpulan (ya/tidak/tergantung) → alasan singkat 1-2 kalimat → saran singkat 1 kalimat kalau perlu. "
        f"Total idealnya 2-4 kalimat.\n"
        f"- Kalau user minta list/detail panjang (misal 'kasih beberapa saran', 'jelaskan lengkap'), baru boleh lebih panjang.\n"
        f"- JANGAN pakai markdown sama sekali — tanpa tanda bintang ** (bold), tanpa #, tanpa garis bawah _. "
        f"Teks ditampilkan apa adanya di app (bukan di-render sebagai markdown), jadi tanda-tanda itu bakal "
        f"kelihatan literal sebagai karakter, bukan jadi format tebal.\n"
        f"- Kalau bikin list bernomor, formatnya PERSIS begini: '1. nama_item = penjelasan singkat', "
        f"'2. nama_item = penjelasan singkat', dst — pakai tanda '=' setelah nama item, JANGAN pakai bold/asterisk.\n\n"
        f"BATASAN TOPIK (PENTING):\n"
        f"Kamu HANYA membahas nutrisi, gizi, diet, olahraga, dan pola hidup sehat yang berkaitan dengan tujuan user. "
        f"Kalau ditanya hal di luar itu (contoh: perbandingan mobil, hiburan, politik, teknologi, atau topik apapun "
        f"yang gak nyambung ke kesehatan/pola makan), TOLAK dengan sopan dan singkat, lalu arahkan balik ke topik "
        f"nutrisi — jangan tetap dijawab. Contoh pola tolakan: 'Itu di luar topik yang bisa aku bantu ya, aku "
        f"fokusnya di nutrisi & pola makan 🙂 Ada yang mau ditanya soal itu?'\n\n"
        f"Profil: {user.username}, {user.umur}th, {user.gender}, {user.bb}kg/{user.tb}cm, "
        f"tujuan={user.tujuan}, aktivitas={user.aktivitas}.\n"
        f"BMR={int(user.bmr or 0)} kcal | TDEE={int(user.tdee or 0)} kcal | "
        f"Target: {target_cal} kcal & {target_prot}g protein/hari.\n"
        f"Hari ini ({today}): sudah makan {total_kal_chat} kcal / {total_prot_chat}g protein. "
        f"Makanan: {makanan_chat}. Sisa: {max(0,target_cal-total_kal_chat)} kcal.\n\n"
        f"Jawab spesifik dan personal sesuai data user di atas KALAU relevan sama pertanyaan."
    )

    history      = data.get('history', [])
    history_text = '\n'.join(
        f"{'User' if h['role'] == 'user' else 'NutriAI'}: {h['text']}"
        for h in history[-10:]  # naik dari 6 ke 10
    )
    full_prompt = f"{system_context}\n\n{history_text}\nUser: {msg}\nNutriAI:"

    try:
        result = call_gemini(full_prompt)
        return jsonify({'reply': result['text'], 'tts_text': result['tts_text']}), 200
    except Exception as e:
        return jsonify({'error': f'AI error: {str(e)}'}), 503


@ai_bp.route('/api/ai/weekly-analysis', methods=['GET'])
@jwt_required()
def ai_weekly_analysis():
    """Analisis otomatis laporan 7 hari terakhir oleh AI."""
    user     = get_current_user()
    week_ago = now_utc() - timedelta(days=7)

    # FIX: baris "Laporan.user_id >= user.id" sebelumnya dihapus karena mubazir
    # (sudah ada filter == user.id yang lebih ketat, jadi tidak berpengaruh
    # ke hasil query, cuma bikin kode membingungkan / mirip pola bug lama).
    laporan = Laporan.query.filter(
        Laporan.user_id == user.id,
        Laporan.tanggal >= week_ago,
    ).order_by(Laporan.tanggal.asc()).all()

    if not laporan:
        return jsonify({'error': 'Belum ada laporan minggu ini'}), 404

    target_cal, target_prot = get_targets(user)
    avg_kal  = round(sum(l.total_kalori  for l in laporan) / len(laporan))
    avg_prot = round(sum(l.total_protein for l in laporan) / len(laporan))

    prompt = (
        f"Kamu adalah NutriAI. Buat analisis mingguan dalam Bahasa Indonesia yang personal dan memotivasi.\n"
        f"Data user: {user.username}, tujuan {user.tujuan}, bb {user.bb}kg.\n"
        f"Target harian: {target_cal} kcal & {target_prot}g protein.\n"
        f"Rata-rata minggu ini: {avg_kal} kcal & {avg_prot}g protein.\n"
        f"Detail per hari: {', '.join(f'{l.tanggal.strftime(chr(37)+chr(100)+chr(47)+chr(37)+chr(109))}: {l.total_kalori}kcal/{l.total_protein}gP' for l in laporan)}.\n"
        f"Buat ringkasan 3-4 kalimat: pencapaian, kekurangan, dan 1 saran konkret untuk minggu depan."
    )

    try:
        result = call_gemini(prompt)
        return jsonify({
            'analysis': result['text'],
            'tts_text': result['tts_text'],
            'stats': {
                'avg_kalori':    avg_kal,
                'avg_protein':   avg_prot,
                'hari_input':    len(laporan),
                'target_kalori': target_cal,
                'target_protein':target_prot,
            },
        }), 200
    except Exception as e:
        return jsonify({'error': f'AI error: {str(e)}'}), 503


# ─────────────────────────────────────────────────────────
#  VOICE COMMAND (endpoint terbesar)
# ─────────────────────────────────────────────────────────

@ai_bp.route('/api/ai/voice-command', methods=['POST'])
@jwt_required()
def ai_voice_command():
    user = get_current_user()
    data = request.get_json() or {}

    text_input = (data.get('text')         or '').strip()
    audio_b64  = (data.get('audio_base64') or '').strip()
    mime_type  = (data.get('mime_type')    or 'audio/mp4').strip()
    # Riwayat percakapan dari client (max 6 pesan terakhir)
    history    = data.get('history', [])

    if not text_input and not audio_b64:
        return jsonify({'error': 'Kirim text atau audio_base64'}), 400
    if audio_b64 and len(audio_b64) > 10_000_000:
        return jsonify({'error': 'Audio terlalu panjang, coba bicara lebih singkat'}), 400

    # ── Konteks user ──────────────────────────────────────────────────────────
    target_cal, target_prot = get_targets(user)
    # FIX: sebelumnya `today = now_utc().date()` pakai tanggal UTC langsung.
    # Antara jam 00:00-06:59 WIB, tanggal UTC masih "kemarin" (WIB = UTC+7),
    # jadi data yang dicatat Jarvis dini hari nyasar ke tanggal kemarin dan
    # gak nongol di dashboard (yang pakai tanggal WIB / hari ini beneran).
    now_wib = now_utc() + timedelta(hours=7)
    today   = now_wib.date()
    jam_wib = now_wib.hour
    if   5  <= jam_wib < 10: waktu_default = 'Pagi'
    elif 10 <= jam_wib < 15: waktu_default = 'Siang'
    elif 15 <= jam_wib < 18: waktu_default = 'Sore'
    else:                    waktu_default = 'Malam'

    today_entries = db.session.query(WaktuMakan).filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == today,
        WaktuMakan.deleted_at.is_(None),
    ).all()
    total_kal_hari  = sum(e.kalori  or 0 for e in today_entries)
    total_prot_hari = sum(e.protein or 0 for e in today_entries)

    food_db   = Food.query.filter(
        Food.deleted_at.is_(None),
    ).order_by(Food.nama_makanan).all()
    food_list = '\n'.join(
        f"- id:{f.id} | {f.nama_makanan} | {f.kalori}kcal | {f.protein}g protein"
        f" | karbo:{f.karbo or 0}g | lemak:{f.lemak or 0}g | {f.gram_per_porsi or 100}g/porsi"
        for f in food_db
    ) or '(belum ada makanan di database)'

    makanan_hari = ', '.join(
        f"{e.nama_makanan or '?'}({e.porsi or 1}porsi, {e.waktu_makan})"
        for e in today_entries
    ) or 'belum ada'

    total_air  = db.session.query(db.func.sum(WaterLog.jumlah_ml)).filter(
        WaterLog.user_id == user.id,
        WaterLog.tanggal == today,
    ).scalar() or 0
    target_air = int(user.bb * 33)

    streak     = calc_streak(user.id)
    templates  = MealTemplate.query.filter_by(user_id=user.id)\
        .all()
    template_list = ', '.join(f"id:{t.id}|{t.nama}" for t in templates) or 'belum ada'

    # Bangun riwayat percakapan untuk konteks
    history_text = ''
    if history:
        lines = []
        for h in history[-8:]:  # max 8 pesan terakhir
            role = 'User' if h.get('role') == 'user' else 'Jarvis'
            lines.append(f"{role}: {h.get('text', '')}")
        history_text = '\n'.join(lines)

    system_prompt = f"""Kamu adalah NutriAI Jarvis, asisten nutrisi voice pribadi yang cerdas, hangat, dan peka konteks.
Kamu berbicara seperti teman dekat yang peduli kesehatan — tidak kaku, tidak robotik, tetapi tetap akurat dan informatif.
SELALU balas dalam Bahasa Indonesia yang natural. Gunakan nama user sesekali agar terasa personal.

━━━ PROFIL USER ━━━
Nama: {user.username} | BB: {user.bb}kg | TB: {user.tb}cm | Umur: {user.umur}th | Gender: {user.gender}
Tujuan: {user.tujuan} | Aktivitas: {user.aktivitas} | Tipe tubuh: {user.tipe_tubuh}
BMR: {int(user.bmr or 0)} kcal | TDEE: {int(user.tdee or 0)} kcal
Target harian: {target_cal} kcal / {target_prot}g protein
Waktu sekarang: {now_utc().strftime('%H:%M')} WIB | Tanggal: {today} | Sesi makan: {waktu_default}

━━━ STATUS HARI INI ━━━
Makanan tercatat: {makanan_hari}
Sudah dikonsumsi: {total_kal_hari} kcal / {total_prot_hari}g protein
Sisa target: {max(0, target_cal-total_kal_hari)} kcal / {max(0, target_prot-total_prot_hari)}g protein
Air minum: {total_air}ml dari target {target_air}ml (sisa {max(0, target_air-total_air)}ml)
Streak: {streak['current']} hari berturut-turut (rekor: {streak['longest']} hari)

━━━ DATABASE MAKANAN (untuk input harian) ━━━
{food_list}

━━━ MEAL TEMPLATES USER ━━━
{template_list}

{'━━━ RIWAYAT PERCAKAPAN ━━━' + chr(10) + history_text + chr(10) if history_text else ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEMAMPUAN MEMAHAMI KONTEKS (SANGAT PENTING)

Jarvis harus CERDAS memahami maksud user meskipun ucapannya tidak langsung atau tidak formal.
Gunakan SEMUA konteks: profil user, status hari ini, riwayat percakapan, dan waktu saat ini.

CONTOH PEMAHAMAN KONTEKS IMPLISIT:
- "laper nih" / "perut kosong" / "belum makan dari tadi" → meal_suggestion (sarankan makanan sesuai sisa kalori)
- "abis gym" / "baru olahraga" / "cape banget abis lari" → meal_suggestion (fokus protein recovery)
- "udah makan tadi" / "barusan makan" → add_food (tanya makan apa, atau cek riwayat percakapan)
- "ini cukup nggak?" / "kebanyakan nggak?" → check_nutrition atau analyze_nutrition tergantung konteks
- "gimana progress ku?" / "udah bagus belum?" → check_nutrition
- "minum air ah" / "haus" → add_water (default 250ml jika tidak disebutkan jumlah)
- "timbang tadi X kilo" / "berat gue X" → add_weight
- "hapus yang tadi" / "cancel yang barusan" → delete_food (lihat makanan terakhir di hari ini)
- "rekap hari ini" / "sudah makan apa aja?" → check_today
- "minggu ini gimana?" / "laporannya" → check_laporan
- "tambah [nama makanan] dong ke database" → tambah_data
- "kalori [makanan] berapa?" / "ini sehat nggak?" → analyze_nutrition

PRINSIP INTERPRETASI:
1. Jika ucapan ambigu, pilih intent yang PALING MASUK AKAL berdasarkan konteks (waktu, status hari ini, riwayat)
2. Jika user bilang "ini" / "tadi" / "yang barusan" → lihat riwayat percakapan untuk tahu rujukannya
3. Jika user menyebut makanan tanpa kata "catat/input" → tetap proses sebagai add_food jika konteksnya makan
4. Gunakan waktu saat ini sebagai clue: jam 07.00 → kemungkinan sarapan, jam 12.00 → makan siang, dll
5. Jika belum makan sama sekali hari ini dan user bilang makan → add_food, bukan check_today
6. confidence "low" hanya jika benar-benar tidak bisa dipahami sama sekali, bukan karena kalimat pendek

━━━ PANDUAN INTENT ━━━

▶ add_food → user menyebut sudah/baru/tadi makan sesuatu, atau sebutkan nama makanan dalam konteks konsumsi
  "tadi makan nasi goreng" | "sarapan roti 2 lembar" | "abis makan ayam" | "makan siang nasi padang"
  → Cocokkan ke DATABASE MAKANAN. Jika tidak ada di DB → masukkan ke not_found

▶ tambah_data → user ingin daftarkan makanan baru ke database (bukan mencatat makan)
  "tambahkan data rendang ke database" | "daftarkan tahu goreng" | "input data nutrisi tempe 100g"
  → Isi new_food dengan nilai gizi berdasarkan pengetahuanmu. gram_per_porsi = gram yg disebutkan (default 100)

▶ use_template → user sebut template/preset/menu favorit
  "pakai template sarapan" | "gunakan menu makan siang favorit"

▶ delete_food → user ingin hapus/batalkan entry makanan hari ini
  "hapus nasi goreng tadi" | "batalkan input ayam" | "hapus yang terakhir"
  → Lihat makanan_hari, isi waktu_makan_id jika tahu ID-nya

▶ check_today → user tanya sudah makan apa saja hari ini
▶ check_nutrition → user tanya progress kalori/protein/nutrisi hari ini
▶ check_laporan → user minta laporan mingguan/bulanan
▶ add_water → user minum/catat air. "gelas"=250ml | "botol"=600ml | "liter"=1000ml. Default 250ml
▶ check_water → user tanya progress minum air
▶ add_weight → user catat berat badan. "kilo"/"kg" → berat float
▶ check_weight → user tanya berat badan terakhir/perkembangan
▶ meal_suggestion → user minta saran/rekomendasi makan, atau implisit (laper, abis olahraga, dll)
▶ analyze_nutrition → user tanya info nutrisi, kalori makanan tertentu, tips diet
▶ general → pertanyaan umum kesehatan/gizi yang tidak masuk kategori di atas
▶ unclear → HANYA jika audio benar-benar tidak bisa dipahami (noise, suara tidak jelas)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BALAS HANYA dalam format JSON ini, TIDAK BOLEH ada teks di luar JSON:
{{
  "intent": "add_food|tambah_data|use_template|delete_food|check_today|check_nutrition|check_laporan|add_water|check_water|add_weight|check_weight|meal_suggestion|analyze_nutrition|general|unclear",
  "reply": "Balasan natural hangat Bahasa Indonesia, 1-3 kalimat. Boleh tambah emoji 1-2 jika sesuai. Sebutkan nama user sesekali.",
  "tts_text": "Versi reply tanpa emoji/markdown/simbol/tanda baca khusus untuk TTS. Kalimat lengkap dan natural diucapkan.",
  "confidence": "high|low",
  "unclear_reason": "isi hanya jika confidence low — jelaskan bagian mana yang ambigu",
  "answer": "Untuk general/meal_suggestion/analyze_nutrition: jawaban lengkap, informatif, dan personal di sini. Lainnya kosong string.",
  "params": {{
    "items": [{{"food_id": <id integer dari DB>, "nama_makanan": "...", "porsi": <integer≥1>, "waktu_makan": "Pagi|Siang|Sore|Malam"}}],
    "not_found": ["nama makanan yg tidak ada di database"],
    "new_food": {{
      "nama_makanan": "...",
      "kalori": <integer>,
      "protein": <integer>,
      "karbo": <integer>,
      "lemak": <integer>,
      "serat": <integer>,
      "gram_per_porsi": <integer, default 100>
    }},
    "template_id": <integer id template, untuk use_template>,
    "waktu_makan_override": "Pagi|Siang|Sore|Malam",
    "waktu_makan_id": <integer id WaktuMakan yg mau dihapus>,
    "nama_makanan_hapus": "nama makanan yg mau dihapus jika waktu_makan_id tidak diketahui",
    "jumlah_ml": <integer ml, untuk add_water>,
    "berat": <float kg, untuk add_weight>,
    "periode": "7_hari|30_hari|minggu_ini|bulan_ini",
    "catatan": "opsional"
  }}
}}

ATURAN TEKNIS:
- add_food: WAJIB cocokkan nama ke DATABASE MAKANAN. Fuzzy match diperbolehkan (misal "nasi putih" cocok "Nasi"). Tidak ada di DB → not_found, JANGAN masukkan ke items
- tambah_data: isi new_food dengan estimasi gizi terbaik dari pengetahuanmu. Semua nilai integer. Jika tidak tahu → 0
- Konversi satuan: "centong/piring"=1 porsi nasi | "potong/iris/biji"=1 porsi lauk | "gelas"=250ml | "botol"=600ml | "mangkok/bowl"=1 porsi | "sendok makan"=15g | "sdm"=15g | "sdt"=5g
- Waktu makan: "pagi/sarapan"→Pagi | "siang/makan siang/lunch"→Siang | "sore/snack sore"→Sore | "malam/dinner/makan malam"→Malam. Jika tidak disebutkan → gunakan {waktu_default}
- Jika audio tidak jelas/noise → intent "unclear", bukan general
- JSON harus valid: tidak ada trailing comma, tidak ada teks di luar kurung kurawal terluar"""

    # ── Panggil Gemini ────────────────────────────────────────────────────────
    raw = ''
    try:
        parts = []
        if audio_b64:
            parts.append({'inline_data': {'mime_type': mime_type, 'data': audio_b64}})
            parts.append({'text': (
                f'Transkrip dan pahami perintah voice user di atas. '
                f'Konteks: user bernama {user.username}, sekarang {waktu_default}, '
                f'sudah makan {total_kal_hari} kcal dari target {target_cal} kcal hari ini. '
                f'Balas sesuai instruksi system dalam format JSON.'
            )})
        else:
            parts.append({'text': f'Perintah user: "{text_input}"'})

        model    = os.environ.get('GEMINI_MODEL',   'gemini-2.5-flash')
        api_ver  = os.environ.get('GEMINI_API_VER', 'v1beta')
        endpoint = (
            f'https://generativelanguage.googleapis.com/{api_ver}'
            f'/models/{model}:generateContent?key={GEMINI_API_KEY}'
        )
        payload = json.dumps({
            'system_instruction': {'parts': [{'text': system_prompt}]},
            'contents':           [{'parts': parts}],
            'generationConfig':   {'temperature': 0.4, 'maxOutputTokens': 1800},
        }).encode()

        current_app.logger.info(f'[VoiceCmd] model={model} audio={bool(audio_b64)} len={len(audio_b64)}')

        gemini_result = None
        last_error    = None
        for attempt in range(3):
            try:
                req = urlreq.Request(endpoint, data=payload, headers={'Content-Type': 'application/json'})
                with urlreq.urlopen(req, timeout=55) as resp:
                    gemini_result = json.loads(resp.read())
                break
            except urlerr.HTTPError as http_err:
                err_body   = http_err.read().decode('utf-8', errors='replace')
                last_error = f'HTTP error {http_err.code}: {err_body[:200]}'
                current_app.logger.error(f'[VoiceCmd] HTTPError {http_err.code} (attempt {attempt+1}/3): {err_body[:300]}')
                if http_err.code in (503, 429, 500) and attempt < 2:
                    time.sleep([3, 7, 15][attempt]); continue
                raise RuntimeError(last_error)
            except urlerr.URLError as url_err:
                last_error = str(url_err.reason)
                current_app.logger.error(f'[VoiceCmd] URLError (attempt {attempt+1}/3): {url_err.reason}')
                if attempt < 2:
                    time.sleep([3, 7, 15][attempt]); continue
                raise RuntimeError(f'Koneksi gagal: {last_error}')

        if gemini_result is None:
            raise RuntimeError(last_error or 'Semua retry gagal')

        raw = gemini_result['candidates'][0]['content']['parts'][0]['text'].strip()
        raw = re.sub(r'^```[a-zA-Z]*\s*', '', raw)
        raw = re.sub(r'\s*```$',           '', raw).strip()
        current_app.logger.info(f'[VoiceCmd] Gemini OK: {raw[:100]}')
        ai_data = json.loads(raw)

    except RuntimeError as e:
        return jsonify({'error': f'AI tidak tersedia: {str(e)}'}), 503
    except json.JSONDecodeError as e:
        current_app.logger.error(f'[VoiceCmd] JSON error: {e} | raw: {raw[:300]}')
        return jsonify({'error': 'AI response tidak valid, coba ulangi'}), 500
    except Exception as e:
        current_app.logger.error(f'[VoiceCmd] Unexpected: {e}', exc_info=True)
        return jsonify({'error': f'Error: {str(e)}'}), 500

    intent         = ai_data.get('intent', 'general')
    reply          = ai_data.get('reply', '')
    tts_text       = ai_data.get('tts_text', reply)
    answer         = ai_data.get('answer', '')
    params         = ai_data.get('params') or {}
    confidence     = ai_data.get('confidence', 'high')
    unclear_reason = ai_data.get('unclear_reason', '')
    action_result  = {'intent': intent, 'status': 'ok'}

    if intent == 'unclear':
        return jsonify({
            'intent': 'unclear', 'reply': reply, 'tts_text': tts_text,
            'confidence': 'low', 'unclear_reason': unclear_reason,
            'action_result': {'intent': 'unclear', 'status': 'ok'},
        }), 200

    # ── Eksekusi action ───────────────────────────────────────────────────────
    try:

        if intent == 'add_food':
            items     = params.get('items', [])
            not_found = list(params.get('not_found', []))
            added     = []
            for item in items:
                food_id     = item.get('food_id')
                food_master = db.session.get(Food, food_id) if food_id else None
                if not food_master:
                    name = (item.get('nama_makanan') or '').strip().lower()
                    if name:
                        food_master = Food.query.filter(
                            Food.deleted_at.is_(None),
                            Food.nama_makanan.ilike(f'%{name}%'),
                        ).first()
                if food_master:
                    porsi = max(1, int(item.get('porsi') or 1))
                    wkt   = item.get('waktu_makan') or waktu_default
                    if wkt not in ('Pagi', 'Siang', 'Sore', 'Malam'):
                        wkt = waktu_default
                    db.session.add(WaktuMakan(
                        waktu_makan  = wkt,
                        food_id      = food_master.id,
                        user_id      = user.id,
                        tanggal      = today,
                        porsi        = porsi,
                        nama_makanan = food_master.nama_makanan,
                        protein      = (food_master.protein or 0) * porsi,
                        kalori       = (food_master.kalori  or 0) * porsi,
                        karbo        = (food_master.karbo   or 0) * porsi,
                        lemak        = (food_master.lemak   or 0) * porsi,
                        image        = food_master.image or '',
                    ))
                    added.append({
                        'nama': food_master.nama_makanan, 'porsi': porsi,
                        'waktu': wkt, 'kalori': (food_master.kalori or 0) * porsi, 'protein': (food_master.protein or 0) * porsi,
                    })
                else:
                    nama = item.get('nama_makanan', '')
                    if nama and nama not in not_found:
                        not_found.append(nama)
            if added:
                db.session.commit()
                record_streak(user.id, today)
            action_result.update({'added': added, 'not_found': not_found, 'count': len(added)})

            # FIX: reply dari Gemini digenerate SEBELUM eksekusi DB, jadi bisa
            # kadung optimis ("sudah dicatat!") padahal fuzzy match gagal dan
            # gak ada yang ke-commit. Sinkronkan reply dengan hasil asli di sini.
            if not_found:
                nf_str = ', '.join(f'"{n}"' for n in not_found)
                if not added:
                    reply = (f'Waduh, {nf_str} belum ada di database NutriAI, '
                              'jadi belum aku catat ya. Mau aku bantu tambahkan datanya dulu?')
                else:
                    reply += f' Tapi {nf_str} belum ada di database, jadi belum ke-catat.'
                tts_text = reply

        elif intent == 'tambah_data':
            nf   = params.get('new_food') or {}
            nama = (nf.get('nama_makanan') or '').strip()
            if not nama:
                action_result.update({'status': 'error', 'error': 'Nama makanan tidak ditemukan dari perintah'})
            else:
                existing = Food.query.filter(
                    Food.nama_makanan.ilike(nama),
                    Food.deleted_at.is_(None),
                    db.or_(Food.user_id.is_(None), Food.user_id == user.id),
                ).first()
                if existing:
                    action_result.update({
                        'status': 'duplicate', 'nama': existing.nama_makanan,
                        'kalori': existing.kalori, 'protein': existing.protein,
                        'karbo': existing.karbo or 0, 'lemak': existing.lemak or 0,
                        'gram_per_porsi': existing.gram_per_porsi or 100,
                    })
                else:
                    kalori = int(nf.get('kalori') or 0)
                    if kalori <= 0:
                        action_result.update({'status': 'error', 'error': 'Kalori tidak valid, tidak bisa tambah makanan dengan kalori 0'})
                    else:
                        # FIX: sebelumnya langsung commit ke DB di sini, jadi
                        # ConfirmFoodForm (pendingFood) di JarvisCard.js gak
                        # pernah kepanggil (dead code) karena frontend nunggu
                        # status 'needs_confirmation'. Sekarang cuma kirim
                        # estimasi + status needs_confirmation; yang BENERAN
                        # nyimpen ke DB ada di endpoint /api/ai/confirm-tambah-data
                        # (dipanggil dari tombol "✓ Simpan" di ConfirmFoodForm).
                        action_result.update({
                            'status': 'needs_confirmation',
                            'nama': nama,
                            'kalori': kalori,
                            'protein': int(nf.get('protein') or 0),
                            'karbo': int(nf.get('karbo')   or 0),
                            'lemak': int(nf.get('lemak')   or 0),
                            'serat': int(nf.get('serat')   or 0),
                            'gram_per_porsi': int(nf.get('gram_per_porsi') or 100),
                        })

        elif intent == 'use_template':
            tid      = params.get('template_id')
            template = MealTemplate.query.filter_by(id=tid, user_id=user.id)\
                .first() if tid else None
            if not template:
                nama_tmpl = (params.get('catatan') or '').lower()
                if nama_tmpl:
                    template = MealTemplate.query.filter(
                        MealTemplate.user_id == user.id,
                        MealTemplate.nama.ilike(f'%{nama_tmpl}%'),
                    ).first()
            if not template:
                action_result.update({'status': 'not_found', 'error': 'Template tidak ditemukan'})
            else:
                wkt   = params.get('waktu_makan_override') or waktu_default
                added = 0
                for titem in template.items:
                    if titem.deleted_at or not titem.food:
                        continue
                    src   = titem.food
                    porsi = titem.porsi or 1
                    db.session.add(WaktuMakan(
                        waktu_makan  = wkt,
                        food_id      = src.id,
                        user_id      = user.id,
                        tanggal      = today,
                        porsi        = porsi,
                        nama_makanan = src.nama_makanan,
                        protein      = (src.protein or 0) * porsi,
                        kalori       = (src.kalori  or 0) * porsi,
                        karbo        = (src.karbo   or 0) * porsi,
                        lemak        = (src.lemak   or 0) * porsi,
                        image        = src.image or '',
                    ))
                    added += 1
                db.session.commit()
                record_streak(user.id, today)
                action_result.update({'status': 'ok', 'template_nama': template.nama, 'added': added, 'waktu': wkt})

        elif intent == 'delete_food':
            wm_id = params.get('waktu_makan_id')
            entry = None
            if wm_id:
                entry = WaktuMakan.query.filter_by(id=wm_id, user_id=user.id)\
                    .filter(WaktuMakan.deleted_at.is_(None)).first()
            if not entry:
                nama_hapus = (params.get('nama_makanan_hapus') or '').strip().lower()
                if nama_hapus:
                    entry = db.session.query(WaktuMakan).filter(
                        WaktuMakan.user_id    == user.id,
                        WaktuMakan.tanggal    == today,
                        WaktuMakan.deleted_at.is_(None),
                        Food.nama_makanan.ilike(f'%{nama_hapus}%'),
                    ).order_by(WaktuMakan.id.desc()).first()
            if entry:
                nama_deleted     = entry.nama_makanan or '?'
                entry.deleted_at = now_utc()
                db.session.commit()
                action_result.update({'status': 'deleted', 'nama': nama_deleted})
            else:
                action_result.update({'status': 'not_found', 'error': 'Makanan tidak ditemukan di log hari ini'})

        elif intent == 'add_water':
            ml = max(50, min(int(params.get('jumlah_ml') or 250), 2000))
            db.session.add(WaterLog(user_id=user.id, jumlah_ml=ml, tanggal=today))
            db.session.commit()
            total_ml_baru = db.session.query(db.func.sum(WaterLog.jumlah_ml)).filter(
                WaterLog.user_id == user.id,
                WaterLog.tanggal == today,
            ).scalar() or 0
            action_result.update({
                'added_ml': ml, 'total_ml': total_ml_baru,
                'target_ml': target_air, 'sisa_ml': max(0, target_air - total_ml_baru),
            })

        elif intent == 'check_water':
            action_result.update({
                'total_ml': total_air, 'target_ml': target_air,
                'sisa_ml':  max(0, target_air - total_air),
                'progress': min(round(total_air / target_air * 100, 1), 100) if target_air else 0,
            })

        elif intent == 'add_weight':
            berat = float(params.get('berat') or 0)
            if not (30 <= berat <= 300):
                action_result.update({'status': 'error', 'error': f'Berat {berat}kg tidak valid (30–300kg)'})
            else:
                catatan  = (params.get('catatan') or '').strip()
                existing = WeightHistory.query.filter_by(user_id=user.id, tanggal=today)\
                    .filter(WeightHistory.deleted_at.is_(None)).first()
                if existing:
                    # FIX: kolom di model WeightHistory bernama 'berat', bukan 'bb'.
                    # Sebelumnya ini akan gagal (AttributeError tidak persist ke DB / TypeError saat insert baru).
                    existing.berat = berat; existing.catatan = catatan
                else:
                    db.session.add(WeightHistory(user_id=user.id, berat=berat, tanggal=today, catatan=catatan))
                user.bb = int(round(berat))
                user.bmr, user.tdee = hitung_bmr_tdee(
                    user.bb, user.tb, user.umur, user.gender, user.aktivitas, user.tipe_tubuh
                )
                db.session.commit()
                action_result.update({'berat': berat, 'status': 'saved'})

        elif intent == 'check_weight':
            latest = WeightHistory.query.filter_by(user_id=user.id)\
                .filter(WeightHistory.deleted_at.is_(None))\
                .order_by(WeightHistory.tanggal.desc()).first()
            prev   = WeightHistory.query.filter_by(user_id=user.id)\
                .filter(WeightHistory.deleted_at.is_(None))\
                .order_by(WeightHistory.tanggal.desc()).offset(1).first()
            if latest:
                action_result.update({
                    'berat': latest.berat, 'tanggal': str(latest.tanggal),
                    'perubahan': round(latest.berat - prev.berat, 1) if prev else 0,
                })

        elif intent == 'check_today':
            action_result['entries'] = [
                {
                    'id':      e.id,
                    'nama':    e.nama_makanan or '?',
                    'waktu':   e.waktu_makan,
                    'porsi':   e.porsi or 1,
                    'kalori':  e.kalori  or 0,
                    'protein': e.protein or 0,
                }
                for e in today_entries
            ]
            action_result.update({
                'total_kalori':   total_kal_hari,
                'total_protein':  total_prot_hari,
                'total_karbo':      sum((e.karbo or 0) for e in today_entries),
                'total_lemak':      sum((e.lemak or 0) for e in today_entries),
                'target_kalori':  target_cal,
                'target_protein': target_prot,
                'sisa_kalori':    max(0, target_cal  - total_kal_hari),
                'sisa_protein':   max(0, target_prot - total_prot_hari),
            })

        elif intent == 'check_nutrition':
            # FIX: sebelumnya 'total_karbo' dan 'total_lemak' ditulis dobel
            # (key duplikat di dict literal) — sudah dirapikan jadi sekali saja.
            action_result.update({
                'total_kalori':     total_kal_hari,
                'total_protein':    total_prot_hari,
                'total_karbo':      sum((e.karbo or 0) for e in today_entries),
                'total_lemak':      sum((e.lemak or 0) for e in today_entries),
                'target_kalori':    target_cal,
                'target_protein':   target_prot,
                'sisa_kalori':      max(0, target_cal  - total_kal_hari),
                'sisa_protein':     max(0, target_prot - total_prot_hari),
                'progress_kalori':  min(round(total_kal_hari  / target_cal  * 100, 1), 100) if target_cal  else 0,
                'progress_protein': min(round(total_prot_hari / target_prot * 100, 1), 100) if target_prot else 0,
                'streak': streak,
            })

        elif intent == 'check_laporan':
            periode = params.get('periode', '7_hari')
            if   periode in ('minggu_ini', '7_hari'):   since_lap = today - timedelta(days=6)
            elif periode in ('bulan_ini',  '30_hari'):  since_lap = today - timedelta(days=29)
            else:                                        since_lap = today - timedelta(days=6)

            entries_lap = WaktuMakan.query.filter(
                WaktuMakan.user_id    == user.id,
                WaktuMakan.tanggal    >= since_lap,
                WaktuMakan.tanggal    <= today,
                WaktuMakan.deleted_at.is_(None),
            ).all()

            per_hari = defaultdict(lambda: {'kalori': 0, 'protein': 0, 'karbo': 0, 'lemak': 0})
            for e in entries_lap:
                tgl = str(e.tanggal)
                per_hari[tgl]['kalori']  += e.kalori  or 0
                per_hari[tgl]['protein'] += e.protein or 0
                per_hari[tgl]['karbo']   += e.karbo   or 0
                per_hari[tgl]['lemak']   += e.lemak   or 0

            hari_list   = sorted(per_hari.items())
            n           = len(hari_list) or 1
            avg_kalori  = round(sum(v['kalori']  for _, v in hari_list) / n)
            avg_protein = round(sum(v['protein'] for _, v in hari_list) / n)
            # FIX: avg_karbo dan avg_lemak sebelumnya tidak pernah dihitung/dikirim,
            # padahal per_hari sudah menyimpan data karbo & lemak per tanggal.
            # Ini kemungkinan besar penyebab "karbo tidak muncul" di laporan.
            avg_karbo   = round(sum(v['karbo']   for _, v in hari_list) / n)
            avg_lemak   = round(sum(v['lemak']   for _, v in hari_list) / n)

            action_result.update({
                'periode': periode, 'since': str(since_lap), 'until': str(today),
                'per_hari':      [{'tanggal': t, **v} for t, v in hari_list],
                'avg_kalori':    avg_kalori,
                'avg_protein':   avg_protein,
                'avg_karbo':     avg_karbo,
                'avg_lemak':     avg_lemak,
                'total_hari':    len(hari_list),
                'target_kalori': target_cal,
                'target_protein':target_prot,
            })

        elif intent in ('meal_suggestion', 'analyze_nutrition', 'general'):
            action_result.update({'answer': answer})

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'[VoiceCmd] Action error intent={intent}: {e}', exc_info=True)
        action_result.update({'status': 'error', 'error': str(e)})
        # FIX: kalau eksekusi/commit DB gagal karena alasan APAPUN, reply
        # dari Gemini udah kadung optimis duluan ("sudah dicatat!") karena
        # reply itu digenerate SEBELUM eksekusi DB (lihat atas). Timpa di
        # sini juga supaya user gak dikasih info palsu pas beneran gagal.
        reply    = 'Waduh, ada masalah pas nyimpan ke database. Coba ulangi beberapa saat lagi ya.'
        tts_text = reply

    return jsonify({
        'intent':         intent,
        'reply':          reply,
        'tts_text':       tts_text,
        'confidence':     confidence,
        'unclear_reason': unclear_reason,
        'action_result':  action_result,
        # Client harus simpan ini dan kirim balik sebagai 'history' di request berikutnya
        'history_entry':  {'role': 'assistant', 'text': reply},
    }), 200


# ─────────────────────────────────────────────────────────
#  CONFIRM TAMBAH DATA — dipanggil dari tombol "✓ Simpan" di
#  ConfirmFoodForm (JarvisCard.js), SETELAH user isi gram_per_porsi
#  & (opsional) foto. Ini yang beneran nulis ke tabel Food, bukan
#  intent 'tambah_data' di /api/ai/voice-command (itu cuma estimasi).
# ─────────────────────────────────────────────────────────
@ai_bp.route('/api/ai/confirm-tambah-data', methods=['POST'])
@jwt_required()
def ai_confirm_tambah_data():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    form = request.form
    nama = (form.get('nama_makanan') or '').strip()
    if not nama:
        return jsonify({'error': 'Nama makanan wajib diisi'}), 400

    try:
        kalori         = int(form.get('kalori') or 0)
        protein        = int(form.get('protein') or 0)
        karbo          = int(form.get('karbo') or 0)
        lemak          = int(form.get('lemak') or 0)
        serat          = int(form.get('serat') or 0)
        gram_per_porsi = int(form.get('gram_per_porsi') or 100)
    except (TypeError, ValueError):
        return jsonify({'error': 'Data nutrisi tidak valid'}), 400

    if kalori <= 0:
        return jsonify({'error': 'Kalori tidak valid, tidak bisa tambah makanan dengan kalori 0'}), 400
    if gram_per_porsi <= 0:
        return jsonify({'error': 'Gram per porsi harus lebih dari 0'}), 400

    # Cek duplikat lagi — bisa aja makanan ini sempat ditambahkan orang lain
    # di antara waktu estimasi (voice-command) dan waktu user tekan "Simpan".
    # HANYA cek makanan yang bisa dilihat user ini (global + milik sendiri) —
    # jangan blokir gara-gara makanan pribadi user LAIN kebetulan nama sama,
    # karena itu tidak pernah kelihatan olehnya juga (pesan akan membingungkan).
    existing = Food.query.filter(
        Food.nama_makanan.ilike(nama),
        Food.deleted_at.is_(None),
        db.or_(Food.user_id.is_(None), Food.user_id == user.id),
    ).first()
    if existing:
        return jsonify({
            'status': 'duplicate',
            'error': f'"{existing.nama_makanan}" sudah ada di database.',
            'food': {
                'id': existing.id, 'nama_makanan': existing.nama_makanan,
                'kalori': existing.kalori, 'protein': existing.protein,
                'karbo': existing.karbo or 0, 'lemak': existing.lemak or 0,
                'gram_per_porsi': existing.gram_per_porsi or 100,
            },
        }), 409

    # ── Foto opsional ──
    # CATATAN: kalau project ini sudah punya helper upload gambar sendiri
    # (dipakai TambahDataScreen misalnya), pakai itu saja supaya konsisten —
    # ini cuma fallback simple local-save.
    image_path = ''
    file = request.files.get('food_image')
    if file and file.filename:
        from werkzeug.utils import secure_filename
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'static/uploads/food')
        os.makedirs(upload_folder, exist_ok=True)
        safe_name = secure_filename(file.filename)
        ext = safe_name.rsplit('.', 1)[-1].lower() if '.' in safe_name else 'jpg'
        filename = f'food_{user.id}_{int(time.time())}.{ext}'
        file.save(os.path.join(upload_folder, filename))
        image_path = f'{upload_folder}/{filename}'.replace('\\', '/')

    food_baru = Food(
        user_id        = user.id,   # FIX: sebelumnya tidak diisi (default NULL) —
                                     # jadinya nyasar tersimpan sebagai makanan
                                     # master/global (kelihatan semua user),
                                     # padahal ini harusnya makanan pribadi
                                     # milik user yang menambahkannya lewat Jarvis.
        nama_makanan   = nama,
        kalori         = kalori,
        protein        = protein,
        karbo          = karbo,
        lemak          = lemak,
        serat          = serat,
        gram_per_porsi = gram_per_porsi,
        image          = image_path,
        is_verified    = False,
    )
    db.session.add(food_baru)
    db.session.commit()

    return jsonify({
        'status': 'added',
        'food': {
            'id': food_baru.id, 'nama_makanan': food_baru.nama_makanan,
            'kalori': food_baru.kalori, 'protein': food_baru.protein,
            'karbo': food_baru.karbo, 'lemak': food_baru.lemak,
            'gram_per_porsi': food_baru.gram_per_porsi,
            'image': food_baru.image,
        },
    }), 200