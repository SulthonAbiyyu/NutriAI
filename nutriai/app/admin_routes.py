import os
import logging
from functools import wraps

from flask import Blueprint, request, jsonify, render_template

from app.models import db, Food, now_utc, safe_int, safe_float
from app.routes import rate_limit, allowed_file, upload_to_supabase

admin_bp = Blueprint('admin', __name__)
logger   = logging.getLogger('nutriai.admin')

# ─────────────────────────────────────────────────────────
#  ADMIN AUTH
#  Sengaja SEDERHANA sesuai kebutuhan: cuma 1 kunci rahasia di
#  .env, tanpa tabel/sistem user admin terpisah. Kunci ini WAJIB
#  dikirim di header 'X-Admin-Key' di setiap request ke endpoint
#  /api/admin/*.
# ─────────────────────────────────────────────────────────
ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', '')


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not ADMIN_SECRET_KEY:
            logger.error('[Admin] ADMIN_SECRET_KEY belum diset di .env — semua endpoint admin diblokir')
            return jsonify({'error': 'Admin CMS belum dikonfigurasi di server (ADMIN_SECRET_KEY kosong)'}), 500
        key = request.headers.get('X-Admin-Key', '')
        if key != ADMIN_SECRET_KEY:
            return jsonify({'error': 'Admin key salah atau tidak dikirim'}), 401
        return fn(*args, **kwargs)
    return wrapper


# ─────────────────────────────────────────────────────────
#  HALAMAN HTML ADMIN
#  Dibuka lewat browser di: http://localhost:5000/admin
#  Halaman ini sendiri publik (cuma berisi form login), tapi
#  semua AKSI (lihat/tambah/edit/hapus data) tetap butuh admin
#  key yang benar lewat endpoint /api/admin/* di bawah.
# ─────────────────────────────────────────────────────────
@admin_bp.route('/admin', methods=['GET'])
def admin_page():
    return render_template('admin.html')


# ─────────────────────────────────────────────────────────
#  LOGIN
#  Cuma memvalidasi key yang diketik user cocok dengan
#  ADMIN_SECRET_KEY di .env. Tidak ada session/cookie/token —
#  key yang sama akan dipakai ulang oleh frontend di setiap
#  request CRUD berikutnya (disimpan di sessionStorage browser).
# ─────────────────────────────────────────────────────────
@admin_bp.route('/api/admin/login', methods=['POST'])
@rate_limit(max_calls=10, window_seconds=300, key_prefix='admin-login')  # 10x/5menit per IP, cegah brute-force
def admin_login():
    if not ADMIN_SECRET_KEY:
        return jsonify({'error': 'Admin CMS belum dikonfigurasi di server (ADMIN_SECRET_KEY kosong)'}), 500

    data = request.get_json() or {}
    key  = data.get('key', '')

    if key != ADMIN_SECRET_KEY:
        logger.warning('[Admin] Percobaan login gagal (IP: %s)', request.headers.get('X-Forwarded-For', request.remote_addr))
        return jsonify({'error': 'Password admin salah'}), 401

    return jsonify({'status': 'success'}), 200


# ─────────────────────────────────────────────────────────
#  CRUD MAKANAN MASTER
#  PENTING: endpoint di bawah ini HANYA menyentuh makanan
#  master/global, yaitu baris Food dengan user_id = NULL.
#  Makanan pribadi milik masing-masing user (Food.user_id
#  terisi angka) TIDAK PERNAH ikut kelihatan atau bisa diubah
#  lewat endpoint ini — itu tetap murni domain endpoint
#  /api/foods (user biasa, login pakai JWT) di routes.py.
# ─────────────────────────────────────────────────────────

@admin_bp.route('/api/admin/foods', methods=['GET'])
@admin_required
def admin_list_foods():
    q     = request.args.get('q', '').strip()
    page  = max(int(request.args.get('page', 1)), 1)
    limit = min(int(request.args.get('limit', 20)), 100)

    query = Food.query.filter(
        Food.user_id.is_(None),
        Food.deleted_at.is_(None),
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


@admin_bp.route('/api/admin/foods', methods=['POST'])
@admin_required
def admin_create_food():
    nama_makanan = request.form.get('nama_makanan', '').strip()
    if not nama_makanan:
        return jsonify({'error': 'Nama makanan wajib diisi'}), 400

    # Cek duplikat khusus di scope makanan master saja
    existing = Food.query.filter(
        Food.nama_makanan.ilike(nama_makanan),
        Food.user_id.is_(None),
        Food.deleted_at.is_(None),
    ).first()
    if existing:
        return jsonify({'error': 'Makanan master dengan nama ini sudah ada'}), 409

    kalori  = safe_float(request.form.get('kalori', 0))
    protein = safe_float(request.form.get('protein', 0))
    if kalori <= 0 or protein < 0:
        return jsonify({'error': 'Kalori harus > 0, protein tidak boleh negatif'}), 400

    image_url = None
    if 'food_image' in request.files:
        file = request.files['food_image']
        if file and file.filename and allowed_file(file.filename):
            image_url = upload_to_supabase(file.read(), file.filename, bucket='foods')

    food = Food(
        user_id        = None,   # NULL = makanan master/global, bukan milik user manapun
        nama_makanan   = nama_makanan,
        protein        = protein,
        kalori         = kalori,
        karbo          = safe_float(request.form.get('karbo', 0)),
        lemak          = safe_float(request.form.get('lemak', 0)),
        serat          = safe_float(request.form.get('serat', 0)),
        gram_per_porsi = safe_float(request.form.get('gram_per_porsi', 100)),
        image          = image_url,
        is_verified    = True,   # data master dianggap sudah terverifikasi admin
    )
    db.session.add(food)
    db.session.commit()
    return jsonify(food.to_dict()), 201


@admin_bp.route('/api/admin/foods/<int:food_id>', methods=['PUT'])
@admin_required
def admin_update_food(food_id):
    # Filter user_id.is_(None) memastikan admin cuma bisa edit makanan
    # master — bukan makanan pribadi user lewat cara "menebak" ID.
    food = Food.query.filter(
        Food.id == food_id,
        Food.user_id.is_(None),
        Food.deleted_at.is_(None),
    ).first()
    if not food:
        return jsonify({'error': 'Makanan master tidak ditemukan'}), 404

    for field in ['nama_makanan', 'protein', 'kalori', 'karbo', 'lemak', 'serat', 'gram_per_porsi']:
        val = request.form.get(field)
        if val is not None:
            if field == 'nama_makanan':
                val = val.strip()
                if not val:
                    return jsonify({'error': 'Nama makanan tidak boleh kosong'}), 400
                setattr(food, field, val)
            else:
                setattr(food, field, safe_float(val))

    if 'food_image' in request.files:
        file = request.files['food_image']
        if file and file.filename and allowed_file(file.filename):
            new_url = upload_to_supabase(file.read(), file.filename, bucket='foods')
            if new_url:
                food.image = new_url

    db.session.commit()
    return jsonify(food.to_dict()), 200


@admin_bp.route('/api/admin/foods/<int:food_id>', methods=['DELETE'])
@admin_required
def admin_delete_food(food_id):
    food = Food.query.filter(
        Food.id == food_id,
        Food.user_id.is_(None),
        Food.deleted_at.is_(None),
    ).first()
    if not food:
        return jsonify({'error': 'Makanan master tidak ditemukan'}), 404

    # Soft-delete, konsisten dengan cara /api/foods (user biasa) menghapus data.
    food.deleted_at = now_utc()
    db.session.commit()
    return jsonify({'status': 'success'}), 200