import os
import re
import time
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from app.models import (
    db, User, Food, WaktuMakan, Laporan,
    WeightHistory, WaterLog, MealTemplate, MealTemplateItem,
    StreakLog, now_utc, now_wib_date, safe_int, safe_float,
)

main_bp = Blueprint('main', __name__)
logger  = logging.getLogger('nutriai.security')


# ─────────────────────────────────────────────────────────
#  SECURITY: rate limiter ringan (in-memory, per-proses)
# ─────────────────────────────────────────────────────────
# CATATAN PENTING: ini sengaja dibuat sederhana (tanpa dependency baru)
# supaya bisa langsung jalan tanpa ubah app factory. Kekurangannya:
# counter TIDAK dibagi antar worker/proses (kalau nanti pakai gunicorn
# dengan >1 worker, tiap worker punya counter sendiri) dan akan reset
# tiap kali server restart. Untuk produksi skala besar, sebaiknya ganti
# dengan Flask-Limiter + Redis storage. Untuk sekarang, ini cukup untuk
# menahan brute-force otomatis dari 1 IP di server single-worker.
_rate_buckets = defaultdict(list)  # key -> list[timestamp]

def rate_limit(max_calls: int, window_seconds: int, key_prefix: str):
    """Batasi jumlah pemanggilan endpoint per IP dalam periode waktu tertentu."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            ip  = request.headers.get('X-Forwarded-For', request.remote_addr) or 'unknown'
            key = f'{key_prefix}:{ip}'
            now = time.time()
            bucket = _rate_buckets[key]
            # buang timestamp yang sudah lewat window
            while bucket and bucket[0] <= now - window_seconds:
                bucket.pop(0)
            if len(bucket) >= max_calls:
                logger.warning('[RateLimit] %s diblokir sementara (IP: %s)', key_prefix, ip)
                return jsonify({'error': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'}), 429
            bucket.append(now)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ─────────────────────────────────────────────────────────
#  SECURITY: validasi kekuatan password (server-side, wajib —
#  validasi di frontend BISA di-bypass dengan panggil API langsung)
# ─────────────────────────────────────────────────────────
def validate_password_strength(password: str):
    """Return None kalau valid, atau string pesan error kalau tidak valid."""
    if not password or len(password) < 8:
        return 'Password minimal 8 karakter'
    if not re.search(r'[a-zA-Z]', password):
        return 'Password harus mengandung minimal 1 huruf'
    if not re.search(r'[0-9]', password):
        return 'Password harus mengandung minimal 1 angka'
    return None


ALLOWED_GENDER    = {'laki_laki', 'perempuan'}
ALLOWED_TUJUAN    = {'bulking', 'cutting', 'maintain'}
ALLOWED_AKTIVITAS = {'sangat_tidak_aktif', 'aktivitas_ringan', 'aktivitas_sedang', 'aktivitas_berat'}
ALLOWED_BODYTYPE  = {'ectomorph', 'mesomorph', 'endomorph'}

# ── Supabase (opsional) ───────────────────────────────────
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        pass

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


# ─────────────────────────────────────────────────────────
#  HELPERS LOKAL
# ─────────────────────────────────────────────────────────

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def upload_to_supabase(file_bytes: bytes, filename: str, bucket: str = 'nutri-ai') -> str | None:
    if not supabase_client:
        return None
    timestamp   = str(int(now_utc().timestamp()))
    name, ext   = os.path.splitext(filename)
    unique_name = f"{name}_{timestamp}{ext}"
    supabase_client.storage.from_(bucket).upload(
        path         = unique_name,
        file         = file_bytes,
        file_options = {"content-type": f"image/{ext.lstrip('.')}"},
    )
    return supabase_client.storage.from_(bucket).get_public_url(unique_name)


def hitung_bmr_tdee(bb, tb, umur, gender, aktivitas, tipe_tubuh):
    """Mifflin-St Jeor + faktor aktivitas + koreksi tipe tubuh."""
    if gender == 'laki_laki':
        bmr = 10 * bb + 6.25 * tb - 5 * umur + 5
    else:
        bmr = 10 * bb + 6.25 * tb - 5 * umur - 161

    activity_factors = {
        'sangat_tidak_aktif': 1.2,
        'aktivitas_ringan':   1.375,
        'aktivitas_sedang':   1.55,
        'aktivitas_berat':    1.725,
    }
    tdee = bmr * activity_factors.get(aktivitas, 1.375)
    body_type_factors = {'ectomorph': 1.1, 'mesomorph': 1.0, 'endomorph': 0.9}
    tdee *= body_type_factors.get(tipe_tubuh, 1.0)
    return round(bmr, 2), round(tdee, 2)


def get_targets(user):
    """Target kalori & protein harian berdasarkan tujuan user."""
    tdee = user.tdee or 0
    if user.tujuan == 'bulking':
        return int(round(tdee + 300)), int(round(user.bb * 2.2))
    elif user.tujuan == 'cutting':
        return int(round(tdee - 300)), int(round(user.bb * 2.5))
    else:
        return int(round(tdee)), int(round(user.bb * 2.0))


def get_current_user():
    return db.session.get(User, int(get_jwt_identity()))


def record_streak(user_id: int, tanggal):
    try:
        if not StreakLog.query.filter_by(user_id=user_id, tanggal=tanggal).first():
            db.session.add(StreakLog(user_id=user_id, tanggal=tanggal))
            db.session.commit()
    except Exception:
        db.session.rollback()


def calc_streak(user_id: int) -> dict:
    from datetime import date as date_type
    logs  = StreakLog.query.filter_by(user_id=user_id).order_by(StreakLog.tanggal.desc()).all()
    dates = sorted({l.tanggal for l in logs}, reverse=True)

    if not dates:
        return {'current': 0, 'longest': 0, 'last_input': None}

    today   = now_wib_date()
    current = 0
    check   = today
    if dates[0] < today - timedelta(days=1):
        current = 0
    else:
        for d in dates:
            if d == check or d == check - timedelta(days=1):
                current += 1
                check = d
            else:
                break

    longest, tmp = 1, 1
    for i in range(1, len(dates)):
        if (dates[i-1] - dates[i]).days == 1:
            tmp += 1
            longest = max(longest, tmp)
        else:
            tmp = 1

    return {
        'current':    current,
        'longest':    max(longest, current),
        'last_input': str(dates[0]) if dates else None,
    }


# ─────────────────────────────────────────────────────────
#  AUTH
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/check-username', methods=['GET'])
@rate_limit(max_calls=30, window_seconds=60, key_prefix='check-username')  # 30x/menit per IP
def check_username():
    """Dipakai RegisterScreen.js untuk cek ketersediaan username secara
    real-time (debounced) sebelum user submit form.
    Contract: GET /api/check-username?username=xxx -> { available: boolean }
    """
    username = (request.args.get('username') or '').strip()
    if not username:
        return jsonify({'error': 'Parameter username wajib diisi'}), 400

    # Batasi panjang biar tidak dipakai query sampah/DoS ringan ke DB
    if len(username) > 50:
        return jsonify({'error': 'Username terlalu panjang'}), 400

    exists = User.query.filter_by(username=username).first() is not None
    return jsonify({'available': not exists}), 200


@main_bp.route('/api/register', methods=['POST'])
@rate_limit(max_calls=5, window_seconds=300, key_prefix='register')  # 5x/5menit per IP
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Body request kosong'}), 400

        required = ['username', 'password', 'umur', 'tb', 'bb', 'gender', 'aktivitas', 'tujuan', 'body_type']
        for field in required:
            if field not in data or not str(data[field]).strip():
                return jsonify({'error': f'Field {field} wajib diisi'}), 400

        # SECURITY: validasi password di SERVER, jangan percaya validasi
        # frontend saja — orang bisa panggil API ini langsung tanpa app.
        pw_error = validate_password_strength(data['password'])
        if pw_error:
            return jsonify({'error': pw_error}), 400

        # SECURITY: whitelist nilai enum — cegah data sampah/tidak valid
        # tersimpan (mis. gender:"admin" atau nilai lain di luar opsi UI).
        if data['gender'] not in ALLOWED_GENDER:
            return jsonify({'error': 'Gender tidak valid'}), 400
        if data['tujuan'] not in ALLOWED_TUJUAN:
            return jsonify({'error': 'Tujuan tidak valid'}), 400
        if data['aktivitas'] not in ALLOWED_AKTIVITAS:
            return jsonify({'error': 'Aktivitas tidak valid'}), 400
        if data['body_type'] not in ALLOWED_BODYTYPE:
            return jsonify({'error': 'Tipe tubuh tidak valid'}), 400

        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username sudah dipakai'}), 409

        umur, tb, bb = int(data['umur']), int(data['tb']), int(data['bb'])
        if not (10 <= umur <= 100):
            return jsonify({'error': 'Umur harus antara 10–100 tahun'}), 400
        if not (100 <= tb <= 250):
            return jsonify({'error': 'Tinggi badan harus antara 100–250 cm'}), 400
        if not (30 <= bb <= 300):
            return jsonify({'error': 'Berat badan harus antara 30–300 kg'}), 400

        bmr, tdee = hitung_bmr_tdee(bb, tb, umur, data['gender'], data['aktivitas'], data['body_type'])

        # FIX BUG: bb_awal & target_bb sebelumnya TIDAK PERNAH di-set di sini
        # (tetap NULL selamanya), sehingga frontend selalu jatuh ke fallback
        # (bb+5 / bb-2) yang dihitung ULANG dari bb TERKINI setiap request.
        # Akibatnya target "mengejar" bb yang sedang berjalan -> progress bar
        # goal jadi konstan (mis. selalu ~28%) dan TIDAK PERNAH mencerminkan
        # progres asli user. bb_awal harus dikunci ke bb saat registrasi, dan
        # target_bb diberi default masuk akal sesuai tujuan (user bisa ubah
        # nanti lewat PUT /api/profile).
        default_target = {
            'bulking':  bb + 5,
            'cutting':  max(30, bb - 5),
            'maintain': bb,
        }.get(data['tujuan'], bb)

        user = User(
            username   = data['username'],
            password_hash = generate_password_hash(data['password']),
            umur=umur, tb=tb, bb=bb,
            tujuan     = data['tujuan'],
            aktivitas  = data['aktivitas'],
            gender     = data['gender'],
            tipe_tubuh = data['body_type'],
            bmr=bmr, tdee=tdee,
            bb_awal    = bb,
            target_bb  = default_target,
        )
        db.session.add(user)
        db.session.commit()
        db.session.add(WeightHistory(user_id=user.id, berat=float(bb), catatan='Berat awal registrasi'))
        db.session.commit()

        token = create_access_token(identity=str(user.id))
        return jsonify({'token': token, 'user': user.to_dict()}), 201

    except ValueError:
        return jsonify({'error': 'Format angka tidak valid'}), 400
    except Exception as e:
        # SECURITY: jangan bocorkan str(e) (detail internal/stack) ke client.
        # Log detail lengkap hanya di server, balas pesan generik ke user.
        db.session.rollback()
        logger.exception('Error saat register')
        return jsonify({'error': 'Registrasi gagal, silakan coba lagi'}), 500


@main_bp.route('/api/login', methods=['POST'])
@rate_limit(max_calls=8, window_seconds=300, key_prefix='login')  # 8x/5menit per IP
def login():
    try:
        data     = request.get_json() or {}
        username = (data.get('username') or '').strip()
        password = (data.get('password') or '').strip()
        if not username or not password:
            return jsonify({'error': 'Username dan password wajib diisi'}), 400

        user = User.query.filter_by(username=username).filter(User.deleted_at.is_(None)).first()
        if not user or not check_password_hash(user.password_hash, password):
            # SECURITY: pesan generik — jangan bedakan "username tidak ada"
            # vs "password salah", supaya tidak bisa dipakai enumerasi username.
            return jsonify({'error': 'Username atau password salah'}), 401

        token = create_access_token(identity=str(user.id))
        return jsonify({'token': token, 'user': user.to_dict()}), 200
    except Exception as e:
        logger.exception('Error saat login')
        return jsonify({'error': 'Login gagal, silakan coba lagi'}), 500


# ─────────────────────────────────────────────────────────
#  PROFILE
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User tidak ditemukan'}), 404
    return jsonify(user.to_dict()), 200


@main_bp.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User tidak ditemukan'}), 404

    data   = request.get_json() or {}
    old_bb = user.bb

    if 'umur' in data and not (10 <= int(data['umur']) <= 100):
        return jsonify({'error': 'Umur harus antara 10–100 tahun'}), 400
    if 'tb' in data and not (100 <= int(data['tb']) <= 250):
        return jsonify({'error': 'Tinggi badan harus antara 100–250 cm'}), 400
    # FIX BUG: pakai float(), bukan int() — 'bb' kolomnya Float, validasi
    # dengan int() membuang desimal (mis. 74.6 lolos padahal harusnya tetap
    # divalidasi sebagai 74.6, bukan dibulatkan diam-diam jadi 74/75).
    if 'bb' in data and not (30 <= float(data['bb']) <= 300):
        return jsonify({'error': 'Berat badan harus antara 30–300 kg'}), 400
    # target_bb & bb_awal: field goal yang sekarang BISA diubah lewat sini
    # (sebelumnya tidak ada whitelist untuk ini sama sekali, jadi goal user
    # tidak pernah bisa di-set/reset secara eksplisit).
    if 'target_bb' in data and not (30 <= float(data['target_bb']) <= 300):
        return jsonify({'error': 'Target berat badan harus antara 30–300 kg'}), 400
    if 'bb_awal' in data and not (30 <= float(data['bb_awal']) <= 300):
        return jsonify({'error': 'Berat badan awal harus antara 30–300 kg'}), 400
    # SECURITY: whitelist enum — cegah nilai sembarangan tersimpan lewat
    # request langsung ke API (bypass UI pilihan yang sudah dibatasi).
    if 'gender' in data and data['gender'] not in ALLOWED_GENDER:
        return jsonify({'error': 'Gender tidak valid'}), 400
    if 'tujuan' in data and data['tujuan'] not in ALLOWED_TUJUAN:
        return jsonify({'error': 'Tujuan tidak valid'}), 400
    if 'aktivitas' in data and data['aktivitas'] not in ALLOWED_AKTIVITAS:
        return jsonify({'error': 'Aktivitas tidak valid'}), 400
    if 'tipe_tubuh' in data and data['tipe_tubuh'] not in ALLOWED_BODYTYPE:
        return jsonify({'error': 'Tipe tubuh tidak valid'}), 400

    for field in ['umur', 'tb', 'bb', 'tujuan', 'aktivitas', 'tipe_tubuh', 'gender', 'target_bb', 'bb_awal']:
        if field in data:
            # bb/tb/umur/target_bb/bb_awal semua numerik — cast eksplisit
            # supaya tidak nyimpen string dari JSON mentah-mentah.
            if field in ('bb', 'target_bb', 'bb_awal'):
                setattr(user, field, float(data[field]))
            elif field in ('umur', 'tb'):
                setattr(user, field, int(data[field]))
            else:
                setattr(user, field, data[field])

    user.bmr, user.tdee = hitung_bmr_tdee(
        user.bb, user.tb, user.umur, user.gender, user.aktivitas, user.tipe_tubuh
    )

    # FIX BUG: dulu dibandingkan int(data['bb']) != old_bb (old_bb float) —
    # kalau user ganti dari 74.6 ke 74.8, int() keduanya bisa sama-sama 74
    # atau 75, sehingga histori berat kadang GAGAL tercatat padahal beratnya
    # memang berubah. Sekarang dibandingkan sebagai float.
    if 'bb' in data and float(data['bb']) != old_bb:
        db.session.add(WeightHistory(
            user_id=user.id, berat=user.bb,
            catatan=data.get('catatan_berat', ''),
        ))

    db.session.commit()
    return jsonify(user.to_dict()), 200


@main_bp.route('/api/profile/password', methods=['PUT'])
@jwt_required()
@rate_limit(max_calls=5, window_seconds=300, key_prefix='change_password')
def update_password():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User tidak ditemukan'}), 404

    data    = request.get_json() or {}
    old_pw  = data.get('password_lama', '')
    new_pw  = data.get('password_baru', '')
    confirm = data.get('konfirmasi', '')

    if not old_pw or not new_pw:
        return jsonify({'error': 'Password lama dan baru wajib diisi'}), 400
    if not check_password_hash(user.password_hash, old_pw):
        return jsonify({'error': 'Password lama tidak sesuai'}), 400
    # SECURITY: samakan kekuatan minimal dengan endpoint register — jangan
    # sampai user bisa "downgrade" ke password lemah lewat endpoint ini.
    pw_error = validate_password_strength(new_pw)
    if pw_error:
        return jsonify({'error': pw_error}), 400
    if confirm and new_pw != confirm:
        return jsonify({'error': 'Konfirmasi password tidak cocok'}), 400

    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Password berhasil diubah'}), 200


@main_bp.route('/api/profile/picture', methods=['POST'])
@jwt_required()
def update_profile_picture():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User tidak ditemukan'}), 404
    if 'profile_picture' not in request.files:
        return jsonify({'error': 'File tidak ditemukan di request'}), 400

    file = request.files['profile_picture']
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'Tipe file tidak diizinkan'}), 400

    public_url = upload_to_supabase(file.read(), secure_filename(file.filename), bucket='profiles')
    if not public_url:
        return jsonify({'error': 'Supabase Storage belum dikonfigurasi'}), 500

    # NOTE: model User pakai kolom 'foto_url', bukan 'profile_picture'.
    # Sebelumnya kode ini menulis ke 'profile_picture' yang bukan kolom DB,
    # jadi tidak pernah benar-benar tersimpan.
    user.foto_url = public_url
    db.session.commit()
    return jsonify({'profile_picture_url': public_url}), 200


# ─────────────────────────────────────────────────────────
#  FOOD DATABASE
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/foods', methods=['GET'])
@jwt_required()
def get_foods():
    user  = get_current_user()
    q     = request.args.get('q', '').strip()
    page  = max(int(request.args.get('page',  1)), 1)
    limit = min(int(request.args.get('limit', 20)), 100)

    # Tampilkan makanan global (user_id NULL, dilihat semua orang) DAN
    # makanan pribadi milik user yang login sendiri — tidak menampilkan
    # makanan pribadi milik user lain.
    query = Food.query.filter(
        Food.deleted_at.is_(None),
        db.or_(Food.user_id.is_(None), Food.user_id == user.id),
    )
    if q:
        query = query.filter(Food.nama_makanan.ilike(f'%{q}%'))

    total = query.count()
    foods = query.order_by(Food.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'data':        [f.to_dict() for f in foods],
        'total':       total,
        'page':        page,
        'limit':       limit,
        'total_pages': (total + limit - 1) // limit,
    }), 200


@main_bp.route('/api/foods', methods=['POST'])
@jwt_required()
def add_food():
    user         = get_current_user()
    nama_makanan = request.form.get('nama_makanan', '').strip()
    if not nama_makanan:
        return jsonify({'error': 'Nama makanan wajib diisi'}), 400

    # Cek duplikat HANYA di scope yang bisa dilihat user ini (global + milik
    # sendiri) — jangan blokir gara-gara nama yang sama persis kebetulan
    # dipakai user lain di makanan pribadi mereka (yang tidak kelihatan
    # olehnya juga, jadi pesan "sudah ada" akan membingungkan).
    existing = Food.query.filter(
        Food.nama_makanan.ilike(nama_makanan),
        Food.deleted_at.is_(None),
        db.or_(Food.user_id.is_(None), Food.user_id == user.id),
    ).first()
    if existing:
        return jsonify({'error': 'Makanan dengan nama ini sudah ada di database'}), 409

    protein = safe_float(request.form.get('protein', 0))
    kalori  = safe_float(request.form.get('kalori', 0))

    if kalori <= 0 or protein < 0:
        return jsonify({'error': 'Kalori harus > 0, protein tidak boleh negatif'}), 400

    image_url = None
    if 'food_image' in request.files:
        file = request.files['food_image']
        if file and allowed_file(file.filename):
            image_url = upload_to_supabase(file.read(), secure_filename(file.filename), bucket='foods')

    # user_id diisi = makanan ini pribadi, cuma kelihatan buat user ini
    # sendiri. Database "utama"/default (user_id NULL) tidak pernah
    # ditambah lewat endpoint ini — itu cuma diisi manual di awal/seed data.
    food = Food(
        user_id        = user.id,
        nama_makanan   = nama_makanan,
        protein        = protein,
        kalori         = kalori,
        karbo          = safe_float(request.form.get('karbo', 0)),
        lemak          = safe_float(request.form.get('lemak', 0)),
        serat          = safe_float(request.form.get('serat', 0)),
        gram_per_porsi = safe_float(request.form.get('gram_per_porsi', 100)),
        image          = image_url,
    )
    db.session.add(food)
    db.session.commit()
    return jsonify(food.to_dict()), 201


@main_bp.route('/api/foods/<int:food_id>', methods=['PUT'])
@jwt_required()
def update_food(food_id):
    user = get_current_user()
    # SECURITY/OWNERSHIP FIX: sebelumnya endpoint ini bisa dipakai untuk
    # mengedit makanan APAPUN (termasuk makanan global default & makanan
    # pribadi milik user lain) — tidak ada pengecekan kepemilikan sama
    # sekali. Sekarang cuma boleh edit makanan yang user_id-nya = diri
    # sendiri (makanan pribadi miliknya). Makanan global (user_id NULL)
    # sengaja tidak bisa diedit dari sini — itu database default bersama.
    food = Food.query.filter_by(id=food_id, user_id=user.id)\
        .filter(Food.deleted_at.is_(None)).first()
    if not food:
        return jsonify({'error': 'Makanan tidak ditemukan, atau bukan milikmu'}), 404

    # Pakai request.form (bukan get_json) agar bisa terima FormData + file gambar
    for field in ['nama_makanan', 'protein', 'kalori', 'karbo', 'lemak', 'serat', 'gram_per_porsi']:
        val = request.form.get(field)
        if val is not None:
            if field == 'nama_makanan':
                setattr(food, field, val.strip())
            else:
                setattr(food, field, safe_float(val))

    # Upload gambar baru kalau ada
    if 'food_image' in request.files:
        file = request.files['food_image']
        if file and allowed_file(file.filename):
            new_url = upload_to_supabase(file.read(), secure_filename(file.filename), bucket='foods')
            if new_url:
                food.image = new_url

    db.session.commit()
    return jsonify(food.to_dict()), 200


@main_bp.route('/api/foods/<int:food_id>', methods=['DELETE'])
@jwt_required()
def delete_food(food_id):
    user = get_current_user()
    # SECURITY/OWNERSHIP FIX: sama seperti update_food — cuma boleh hapus
    # makanan pribadi milik sendiri, bukan makanan global atau milik user lain.
    food = Food.query.filter_by(id=food_id, user_id=user.id)\
        .filter(Food.deleted_at.is_(None)).first()
    if not food:
        return jsonify({'error': 'Makanan tidak ditemukan, atau bukan milikmu'}), 404

    food.deleted_at = now_utc()
    db.session.commit()
    return jsonify({'status': 'success'}), 200


# ─────────────────────────────────────────────────────────
#  INPUT HARIAN
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/daily', methods=['GET'])
@jwt_required()
def get_daily():
    user     = get_current_user()
    date_str = request.args.get('date', str(now_wib_date()))
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        target_date = now_wib_date()

    # FIX: sebelumnya pakai .join(Food) lalu ambil nilai dari e.food.X (master
    # data Food). Ini salah karena WaktuMakan sudah menyimpan nilai nutrisi
    # sendiri (sudah dikali porsi) — dan kalau food_id kosong (custom entry),
    # INNER JOIN akan membuang entry itu dari hasil sama sekali.
    # Sekarang pakai nilai WaktuMakan langsung (e.protein/e.kalori/e.karbo/e.lemak).
    entries = WaktuMakan.query.filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == target_date,
        WaktuMakan.deleted_at.is_(None),
    ).all()

    grouped = {'Pagi': [], 'Siang': [], 'Sore': [], 'Malam': []}
    for e in entries:
        if e.waktu_makan in grouped:
            grouped[e.waktu_makan].append(e.to_dict())

    total_protein = sum(e.protein or 0 for e in entries)
    total_kalori  = sum(e.kalori  or 0 for e in entries)
    # FIX: total_karbo & total_lemak sebelumnya tidak pernah dihitung/dikirim
    # sama sekali di endpoint ini — makanya karbo tidak muncul di frontend.
    total_karbo   = sum(e.karbo  or 0 for e in entries)
    total_lemak   = sum(e.lemak  or 0 for e in entries)
    target_cal, target_prot = get_targets(user)

    return jsonify({
        'grouped':          grouped,
        'total_protein':    total_protein,
        'total_kalori':     total_kalori,
        'total_karbo':      total_karbo,
        'total_lemak':      total_lemak,
        'target_kalori':    target_cal,
        'target_protein':   target_prot,
        'progress_kalori':  min(round((total_kalori  / target_cal)  * 100, 1), 100) if target_cal  else 0,
        'progress_protein': min(round((total_protein / target_prot) * 100, 1), 100) if target_prot else 0,
        'sisa_kalori':      max(target_cal  - total_kalori,  0),
        'sisa_protein':     max(target_prot - total_protein, 0),
    }), 200


@main_bp.route('/api/daily', methods=['POST'])
@jwt_required()
def submit_daily():
    user  = get_current_user()
    data  = request.get_json()
    today = now_wib_date()

    if not data or not isinstance(data, list):
        return jsonify({'error': 'Data harus berupa array JSON'}), 400

    added = 0
    for item in data:
        if not all(k in item for k in ['nama_makanan', 'porsi', 'protein', 'kalori', 'waktu_makan']):
            continue

        porsi   = int(item['porsi'])
        protein = safe_float(item['protein'])
        kalori  = safe_float(item['kalori'])
        karbo   = safe_float(item.get('karbo', 0))
        lemak   = safe_float(item.get('lemak', 0))

        # FIX: Food model TIDAK punya kolom 'porsi' — sebelumnya dikirim ke
        # sini dan bikin TypeError setiap kali endpoint ini dipanggil.
        # 'porsi' adalah milik WaktuMakan, bukan Food (Food = master data per-porsi dasar).
        food = Food(
            user_id        = user.id,   # FIX: sebelumnya tidak diisi (default NULL) —
                                         # jadinya nyasar tersimpan sebagai makanan
                                         # master/global (kelihatan semua user),
                                         # padahal ini makanan pribadi milik user
                                         # yang submit lewat /api/daily.
            nama_makanan   = item['nama_makanan'],
            protein        = protein,
            kalori         = kalori,
            karbo          = karbo,
            lemak          = lemak,
            image          = item.get('image', ''),
        )
        db.session.add(food)
        db.session.flush()

        # FIX: sebelumnya WaktuMakan dibuat tanpa 'user_id' (kolom wajib/NOT
        # NULL di model → akan gagal disimpan) dan tanpa nilai nutrisi denormalized
        # (protein/kalori/karbo/lemak/porsi/nama_makanan), sehingga entry yang
        # berhasil tersimpan pun akan tampil dengan nutrisi 0 di semua endpoint
        # yang membaca WaktuMakan langsung (bukan lewat join Food).
        db.session.add(WaktuMakan(
            user_id      = user.id,
            waktu_makan  = item['waktu_makan'],
            food_id      = food.id,
            nama_makanan = item['nama_makanan'],
            protein      = protein * porsi,
            kalori       = kalori  * porsi,
            karbo        = karbo   * porsi,
            lemak        = lemak   * porsi,
            porsi        = porsi,
            tanggal      = today,
            catatan      = item.get('catatan', ''),
        ))
        added += 1

    db.session.commit()
    record_streak(user.id, today)
    return jsonify({'status': 'success', 'added': added}), 200


@main_bp.route('/api/daily/<int:waktu_makan_id>', methods=['DELETE'])
@jwt_required()
def delete_daily(waktu_makan_id):
    user  = get_current_user()
    # SECURITY FIX (IDOR): sebelumnya query ini TIDAK memfilter user_id,
    # sehingga user manapun yang login bisa menghapus catatan makan milik
    # user lain hanya dengan menebak/mengganti waktu_makan_id di request.
    # Sekarang wajib entry.user_id == user.id, kalau tidak dianggap 404
    # (bukan 403) supaya penyerang tidak bisa membedakan "ada tapi bukan
    # milikmu" vs "memang tidak ada" — mencegah enumerasi ID valid.
    entry = WaktuMakan.query.filter_by(id=waktu_makan_id, user_id=user.id).first()
    if not entry:
        return jsonify({'error': 'Data tidak ditemukan'}), 404

    entry.deleted_at = now_utc()
    food = entry.food
    if food:
        db.session.delete(food)
    db.session.commit()
    return jsonify({'status': 'success'}), 200


@main_bp.route('/api/daily/<int:waktu_makan_id>', methods=['PUT'])
@jwt_required()
def edit_daily(waktu_makan_id):
    user  = get_current_user()
    # SECURITY FIX (IDOR): sama seperti delete_daily — tambahkan filter
    # user_id supaya user tidak bisa mengedit catatan makan milik user lain.
    entry = WaktuMakan.query.filter_by(id=waktu_makan_id, user_id=user.id)\
        .filter(WaktuMakan.deleted_at.is_(None)).first()
    if not entry:
        return jsonify({'error': 'Data tidak ditemukan'}), 404

    data = request.get_json() or {}
    if 'waktu_makan' in data and data['waktu_makan'] in ['Pagi', 'Siang', 'Sore', 'Malam']:
        entry.waktu_makan = data['waktu_makan']
    if 'catatan' in data:
        entry.catatan = data['catatan']

    db.session.commit()
    return jsonify(entry.to_dict()), 200


# ─────────────────────────────────────────────────────────
#  DASHBOARD
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    user  = get_current_user()
    today = now_wib_date()

    def qw(waktu):
        # FIX: tidak perlu .join(Food) lagi karena semua nilai nutrisi
        # sudah ada langsung di WaktuMakan (denormalized).
        return WaktuMakan.query.filter(
            WaktuMakan.waktu_makan == waktu,
            WaktuMakan.user_id     == user.id,
            WaktuMakan.tanggal     == today,
            WaktuMakan.deleted_at.is_(None),
        ).all()

    pagi, siang, sore, malam = qw('Pagi'), qw('Siang'), qw('Sore'), qw('Malam')

    # FIX: sebelumnya calc() cuma mengembalikan (protein, kalori) — karbo dan
    # lemak tidak pernah dihitung sama sekali di endpoint dashboard ini.
    # Ini kemungkinan besar penyebab "karbo tidak muncul" di layar Home kamu.
    def calc(lst):
        protein = sum(w.protein or 0 for w in lst)
        kalori  = sum(w.kalori  or 0 for w in lst)
        karbo   = sum(w.karbo   or 0 for w in lst)
        lemak   = sum(w.lemak   or 0 for w in lst)
        return protein, kalori, karbo, lemak

    pp, kp, kap, lp     = calc(pagi)
    ps, ks, kas, ls     = calc(siang)
    pso, kso, kaso, lso = calc(sore)
    pm, km, kam, lm     = calc(malam)

    total_protein = pp + ps + pso + pm
    total_kalori  = kp + ks + kso + km
    total_karbo   = kap + kas + kaso + kam
    total_lemak   = lp + ls + lso + lm
    target_cal, target_prot = get_targets(user)
    streak        = calc_streak(user.id)

    return jsonify({
        'user':             user.to_dict(),
        'bmr':              int(round(user.bmr  or 0)),
        'tdee':             int(round(user.tdee or 0)),
        'target_kalori':    target_cal,
        'target_protein':   target_prot,
        'total_kalori':     total_kalori,
        'total_protein':    total_protein,
        'total_karbo':      total_karbo,
        'total_lemak':      total_lemak,
        'sisa_kalori':      max(target_cal  - total_kalori,  0),
        'sisa_protein':     max(target_prot - total_protein, 0),
        'progress_kalori':  min(round((total_kalori  / target_cal)  * 100, 1), 100) if target_cal  else 0,
        'progress_protein': min(round((total_protein / target_prot) * 100, 1), 100) if target_prot else 0,
        'streak':           streak,
        'per_waktu': {
            'Pagi':  {'items': [w.to_dict() for w in pagi],  'protein': pp,  'kalori': kp,  'karbo': kap,  'lemak': lp},
            'Siang': {'items': [w.to_dict() for w in siang], 'protein': ps,  'kalori': ks,  'karbo': kas,  'lemak': ls},
            'Sore':  {'items': [w.to_dict() for w in sore],  'protein': pso, 'kalori': kso, 'karbo': kaso, 'lemak': lso},
            'Malam': {'items': [w.to_dict() for w in malam], 'protein': pm,  'kalori': km,  'karbo': kam,  'lemak': lm},
        },
    }), 200


# ─────────────────────────────────────────────────────────
#  LAPORAN
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/laporan', methods=['GET'])
@jwt_required()
def get_laporan():
    user  = get_current_user()
    page  = max(int(request.args.get('page', 1)), 1)
    limit = min(int(request.args.get('limit', 30)), 90)

    query       = Laporan.query.filter_by(user_id=user.id).order_by(Laporan.tanggal.desc())
    total       = query.count()
    data        = query.offset((page - 1) * limit).limit(limit).all()
    target_cal, target_prot = get_targets(user)

    avg_protein = round(sum(l.total_protein for l in data) / len(data)) if data else 0
    avg_kalori  = round(sum(l.total_kalori  for l in data) / len(data)) if data else 0
    # FIX: avg_karbo & avg_lemak sebelumnya tidak dihitung sama sekali,
    # padahal tabel Laporan sudah menyimpan total_karbo & total_lemak per hari.
    avg_karbo   = round(sum((l.total_karbo or 0) for l in data) / len(data)) if data else 0
    avg_lemak   = round(sum((l.total_lemak or 0) for l in data) / len(data)) if data else 0

    return jsonify({
        'laporan':        [l.to_dict() for l in data],
        'avg_protein':    avg_protein,
        'avg_kalori':     avg_kalori,
        'avg_karbo':      avg_karbo,
        'avg_lemak':      avg_lemak,
        'target_kalori':  target_cal,
        'target_protein': target_prot,
        'total':          total,
        'page':           page,
        'limit':          limit,
    }), 200


@main_bp.route('/api/laporan', methods=['POST'])
@jwt_required()
def buat_laporan():
    user  = get_current_user()
    today = now_wib_date()

    # FIX: hapus .join(Food) — tidak diperlukan lagi dan berisiko membuang
    # entry yang food_id-nya kosong (mis. custom food dari AI voice command).
    entries = WaktuMakan.query.filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == today,
        WaktuMakan.deleted_at.is_(None),
    ).all()

    if not entries:
        return jsonify({'error': 'Belum ada input makanan hari ini'}), 400

    # FIX 1: Laporan model TIDAK punya kolom 'waktu_makan' — baris ini
    # sebelumnya akan membuat Flask crash (TypeError) setiap kali endpoint
    # ini dipanggil, jadi laporan harian tidak pernah benar-benar tersimpan.
    # FIX 2: nilai sebelumnya diambil dari w.food.X (master data Food, TIDAK
    # memperhitungkan porsi). Sekarang pakai w.X (nilai asli WaktuMakan yang
    # sudah dikalikan porsi saat entry dibuat) — ini juga penyebab karbo
    # laporan salah/tidak konsisten dengan yang tercatat di log harian.
    laporan = Laporan(
        user_id       = user.id,
        total_protein = sum(w.protein or 0 for w in entries),
        total_kalori  = sum(w.kalori  or 0 for w in entries),
        total_karbo   = sum(w.karbo   or 0 for w in entries),
        total_lemak   = sum(w.lemak   or 0 for w in entries),
        tanggal       = now_utc(),
    )
    db.session.add(laporan)
    db.session.commit()
    return jsonify(laporan.to_dict()), 201


@main_bp.route('/api/laporan/reset', methods=['POST'])
@jwt_required()
def reset_and_report():
    user  = get_current_user()
    today = now_wib_date()

    entries = WaktuMakan.query.filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == today,
        WaktuMakan.deleted_at.is_(None),
    ).all()

    if not entries:
        return jsonify({'status': 'no_data', 'message': 'Tidak ada data hari ini'}), 200

    laporan = Laporan(
        user_id       = user.id,
        total_protein = sum(w.protein or 0 for w in entries),
        total_kalori  = sum(w.kalori  or 0 for w in entries),
        total_karbo   = sum(w.karbo   or 0 for w in entries),
        total_lemak   = sum(w.lemak   or 0 for w in entries),
        tanggal       = now_utc(),
    )
    db.session.add(laporan)

    for w in entries:
        db.session.delete(w)

    db.session.commit()
    return jsonify({'status': 'success', 'laporan': laporan.to_dict()}), 200


# ─────────────────────────────────────────────────────────
#  WEIGHT TRACKER
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/weight', methods=['GET'])
@jwt_required()
def get_weight():
    user  = get_current_user()
    limit = min(int(request.args.get('limit', 30)), 365)
    data  = WeightHistory.query.filter_by(user_id=user.id)\
        .filter(WeightHistory.deleted_at.is_(None))\
        .order_by(WeightHistory.tanggal.desc()).limit(limit).all()

    records = [r.to_dict() for r in data]
    return jsonify({
        'data':    records,
        'current': records[0]['bb'] if records else user.bb,
        'initial': records[-1]['bb'] if records else user.bb,
        'change':  round(records[0]['bb'] - records[-1]['bb'], 1) if len(records) > 1 else 0,
    }), 200


@main_bp.route('/api/weight', methods=['POST'])
@jwt_required()
def add_weight():
    user = get_current_user()
    data = request.get_json() or {}
    bb   = data.get('bb')

    if bb is None or not (30 <= float(bb) <= 300):
        return jsonify({'error': 'Berat badan harus antara 30–300 kg'}), 400

    today    = now_wib_date()
    existing = WeightHistory.query.filter_by(user_id=user.id, tanggal=today)\
        .filter(WeightHistory.deleted_at.is_(None)).first()
    if existing:
        existing.berat   = float(bb)
        existing.catatan = data.get('catatan', existing.catatan)
    else:
        db.session.add(WeightHistory(user_id=user.id, berat=float(bb), catatan=data.get('catatan', '')))

    # FIX BUG: sebelumnya int(round(...)) MEMBULATKAN bb ke bilangan bulat,
    # padahal weight_history.berat & kolom users.bb sama-sama Float. Efeknya:
    # WeightTrackerScreen (baca dari weight_history, presisi desimal) dan
    # GoalCard di Dashboard (baca dari users.bb, sudah dibulatkan) menampilkan
    # angka berat yang BEDA untuk data yang sama. Sekarang disimpan apa
    # adanya (float) supaya kedua tempat konsisten.
    user.bb = round(float(bb), 1)
    user.bmr, user.tdee = hitung_bmr_tdee(
        user.bb, user.tb, user.umur, user.gender, user.aktivitas, user.tipe_tubuh
    )
    db.session.commit()
    return jsonify({'status': 'success', 'bb': user.bb}), 201


# ─────────────────────────────────────────────────────────
#  WATER TRACKER
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/water/today', methods=['GET'])
@jwt_required()
def get_water_today():
    user  = get_current_user()
    today = now_wib_date()
    logs  = WaterLog.query.filter_by(user_id=user.id, tanggal=today).all()
    total_ml = sum(l.jumlah_ml for l in logs)
    target   = int(user.bb * 33)

    return jsonify({
        'logs':      [l.to_dict() for l in logs],
        'total_ml':  total_ml,
        'target_ml': target,
        'progress':  min(round((total_ml / target) * 100, 1), 100) if target else 0,
        'sisa_ml':   max(target - total_ml, 0),
    }), 200


@main_bp.route('/api/water', methods=['POST'])
@jwt_required()
def add_water():
    user = get_current_user()
    data = request.get_json() or {}
    ml   = data.get('ml', 250)

    if not (50 <= int(ml) <= 2000):
        return jsonify({'error': 'Volume air harus antara 50–2000 ml per input'}), 400

    db.session.add(WaterLog(user_id=user.id, jumlah_ml=int(ml)))
    db.session.commit()
    return jsonify({'status': 'success', 'ml': int(ml)}), 201


# ─────────────────────────────────────────────────────────
#  STREAK
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/streak', methods=['GET'])
@jwt_required()
def get_streak():
    user = get_current_user()
    return jsonify(calc_streak(user.id)), 200


# ─────────────────────────────────────────────────────────
#  MEAL TEMPLATES
# ─────────────────────────────────────────────────────────

@main_bp.route('/api/templates', methods=['GET'])
@jwt_required()
def get_templates():
    user      = get_current_user()
    # FIX: MealTemplate TIDAK punya kolom deleted_at (lihat models.py —
    # "Tabel: meal_template — tidak ada sync_id, updated_at, deleted_at di
    # Supabase"). Tabel ini pakai hard-delete, bukan soft-delete, jadi filter
    # ini dulu bikin AttributeError setiap kali endpoint ini dipanggil.
    templates = MealTemplate.query.filter_by(user_id=user.id)\
        .order_by(MealTemplate.created_at.desc()).all()
    return jsonify([t.to_dict() for t in templates]), 200


@main_bp.route('/api/templates', methods=['POST'])
@jwt_required()
def create_template():
    user = get_current_user()
    data = request.get_json() or {}
    nama = (data.get('nama') or '').strip()

    if not nama:
        return jsonify({'error': 'Nama template wajib diisi'}), 400

    template = MealTemplate(user_id=user.id, nama=nama, deskripsi=data.get('deskripsi', ''))
    db.session.add(template)
    db.session.flush()

    for item in data.get('items', []):
        # OWNERSHIP FIX: sebelumnya bisa pakai food_id milik siapa saja
        # (termasuk makanan pribadi user lain yang seharusnya tidak
        # kelihatan). Sekarang dibatasi ke makanan yang memang bisa dia lihat.
        food = Food.query.filter(
            Food.id == item.get('food_id'),
            Food.deleted_at.is_(None),
            db.or_(Food.user_id.is_(None), Food.user_id == user.id),
        ).first()
        if food:
            db.session.add(MealTemplateItem(
                template_id=template.id, food_id=food.id,
                porsi=int(item.get('porsi', 1)),
            ))

    db.session.commit()
    return jsonify(template.to_dict()), 201


@main_bp.route('/api/templates/<int:template_id>', methods=['DELETE'])
@jwt_required()
def delete_template(template_id):
    user     = get_current_user()
    # SECURITY FIX (IDOR): tetap dipertahankan — filter user_id supaya user
    # manapun tidak bisa hapus template milik user lain hanya dengan menebak ID.
    # FIX: MealTemplate tidak punya kolom deleted_at, jadi hapus datanya
    # betulan (hard-delete) — bukan soft-delete seperti WaktuMakan/Food.
    # cascade='all, delete-orphan' di relationship items sudah otomatis
    # menghapus MealTemplateItem terkait juga.
    template = MealTemplate.query.filter_by(id=template_id, user_id=user.id).first()
    if not template:
        return jsonify({'error': 'Template tidak ditemukan'}), 404

    db.session.delete(template)
    db.session.commit()
    return jsonify({'status': 'success'}), 200


@main_bp.route('/api/templates/<int:template_id>/use', methods=['POST'])
@jwt_required()
def use_template(template_id):
    user     = get_current_user()
    # SECURITY FIX (IDOR): tetap dipertahankan — filter user_id.
    # FIX: MealTemplate tidak punya kolom deleted_at, hapus filternya.
    template = MealTemplate.query.filter_by(id=template_id, user_id=user.id).first()
    if not template:
        return jsonify({'error': 'Template tidak ditemukan'}), 404

    data        = request.get_json() or {}
    waktu_makan = data.get('waktu_makan', 'Pagi')
    today       = now_wib_date()
    added       = 0

    for titem in template.items:
        # FIX: MealTemplateItem juga tidak punya kolom deleted_at (lihat
        # models.py — "hanya id, template_id, food_id, porsi di Supabase").
        # Cek titem.deleted_at sebelumnya akan AttributeError begitu baris
        # ini sempat kesentuh (setelah get_templates/query di atas dibenerin).
        if not titem.food:
            continue
        src   = titem.food
        porsi = titem.porsi or 1

        # FIX: Food model tidak punya kolom 'porsi' — sebelumnya dikirim ke
        # sini dan menyebabkan TypeError setiap kali template dipakai.
        food_log = Food(
            nama_makanan = src.nama_makanan,
            protein      = (src.protein or 0) * porsi,
            kalori       = (src.kalori  or 0) * porsi,
            karbo        = (src.karbo   or 0) * porsi,
            lemak        = (src.lemak   or 0) * porsi,
            image        = src.image or '',
        )
        db.session.add(food_log)
        db.session.flush()

        # FIX: WaktuMakan sebelumnya dibuat tanpa 'user_id' (kolom wajib) dan
        # tanpa nilai nutrisi denormalized (protein/kalori/karbo/lemak/porsi),
        # sehingga entry dari template akan tampil dengan nutrisi 0 di semua
        # tempat yang membaca WaktuMakan langsung.
        db.session.add(WaktuMakan(
            user_id      = user.id,
            waktu_makan  = waktu_makan,
            food_id      = food_log.id,
            nama_makanan = src.nama_makanan,
            protein      = (src.protein or 0) * porsi,
            kalori       = (src.kalori  or 0) * porsi,
            karbo        = (src.karbo   or 0) * porsi,
            lemak        = (src.lemak   or 0) * porsi,
            porsi        = porsi,
            tanggal      = today,
        ))
        added += 1

    db.session.commit()
    record_streak(user.id, today)
    return jsonify({'status': 'success', 'added': added}), 200