import os
import re
import uuid
import json
import time
from datetime import datetime, timedelta, timezone, date

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from sqlalchemy import text


# ─────────────────────────────────────────────────────────
#  APP CONFIG
# ─────────────────────────────────────────────────────────
app = Flask(__name__)

# CORS: batasi origin di production via env variable
# Contoh .env: ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
_allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*')
CORS(app, origins=_allowed_origins if _allowed_origins != '*' else '*')

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///nutri_ai.db')
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI']        = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY']                 = os.environ.get('JWT_SECRET_KEY') or (_ for _ in ()).throw(RuntimeError('JWT_SECRET_KEY wajib diset di .env'))  # noqa
app.config['JWT_ACCESS_TOKEN_EXPIRES']       = timedelta(days=30)

db      = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt     = JWTManager(app)

# Supabase Storage — untuk foto profil & makanan
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        pass  # Supabase optional, app tetap jalan

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


# ─────────────────────────────────────────────────────────
#  UTILS
# ─────────────────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def gen_uuid() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


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


def safe_int(val, default=0) -> int:
    """Hapus karakter non-angka lalu konversi ke int."""
    try:
        return int(re.sub(r'\D', '', str(val)) or default)
    except (ValueError, TypeError):
        return default


# ─────────────────────────────────────────────────────────
#  MODELS
# ─────────────────────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'user'

    id              = db.Column(db.Integer,     primary_key=True)
    username        = db.Column(db.String(120), unique=True, nullable=False)
    password        = db.Column(db.String(255), nullable=False)
    umur            = db.Column(db.Integer,     nullable=False)
    tb              = db.Column(db.Integer,     nullable=False)
    bb              = db.Column(db.Integer,     nullable=False)
    profile_picture = db.Column(db.String(500), nullable=True)
    tujuan          = db.Column(db.String(50),  nullable=False)
    aktivitas       = db.Column(db.String(50),  nullable=False)
    tipe_tubuh      = db.Column(db.String(50),  nullable=False)
    gender          = db.Column(db.String(10),  nullable=False)
    bmr             = db.Column(db.Float,       nullable=True)
    tdee            = db.Column(db.Float,       nullable=True)
    # ── NEW (Phase 1) ──
    sync_id         = db.Column(db.String(36),  unique=True, default=gen_uuid)
    created_at      = db.Column(db.DateTime,    default=now_utc)
    updated_at      = db.Column(db.DateTime,    default=now_utc, onupdate=now_utc)
    deleted_at      = db.Column(db.DateTime,    nullable=True)

    def to_dict(self):
        bmi = round(self.bb / ((self.tb / 100) ** 2), 1) if self.tb else 0
        return {
            'id':              self.id,
            'username':        self.username,
            'umur':            self.umur,
            'tb':              self.tb,
            'bb':              self.bb,
            'tujuan':          self.tujuan,
            'aktivitas':       self.aktivitas,
            'tipe_tubuh':      self.tipe_tubuh,
            'gender':          self.gender,
            'bmr':             round(self.bmr or 0),
            'tdee':            round(self.tdee or 0),
            'bmi':             bmi,
            'profile_picture': self.profile_picture or '',
            'sync_id':         self.sync_id or '',
        }


class Food(db.Model):
    """
    Dual-purpose (dipertahankan kompatibel, akan dipisah di Phase 2).
    input_from='tambah data' → food database komunal
    input_from='input makanan' → food log harian user (sudah include perkalian porsi)
    """
    __tablename__ = 'food'

    id           = db.Column(db.Integer,     primary_key=True)
    nama_makanan = db.Column(db.String(120), nullable=False)
    porsi        = db.Column(db.Integer,     default=1)
    protein      = db.Column(db.Integer,     nullable=False)
    kalori       = db.Column(db.Integer,     nullable=False)
    image        = db.Column(db.String(500), nullable=True)
    user_id      = db.Column(db.Integer,     db.ForeignKey('user.id'), nullable=True)
    input_from   = db.Column(db.String(50),  nullable=True)
    # ── NEW (Phase 1) ──
    karbo        = db.Column(db.Integer,     nullable=True, default=0)
    lemak        = db.Column(db.Integer,     nullable=True, default=0)
    serat        = db.Column(db.Integer,     nullable=True, default=0)
    gram_per_porsi = db.Column(db.Integer,   nullable=True, default=100)
    is_verified  = db.Column(db.Boolean,     default=False)
    sync_id      = db.Column(db.String(36),  default=gen_uuid)
    created_at   = db.Column(db.DateTime,    default=now_utc)
    updated_at   = db.Column(db.DateTime,    default=now_utc, onupdate=now_utc)
    deleted_at   = db.Column(db.DateTime,    nullable=True)

    def to_dict(self):
        return {
            'id':             self.id,
            'nama_makanan':   self.nama_makanan,
            'porsi':          self.porsi,
            'protein':        self.protein,
            'kalori':         self.kalori,
            'karbo':          self.karbo or 0,
            'lemak':          self.lemak or 0,
            'serat':          self.serat or 0,
            'gram_per_porsi': self.gram_per_porsi or 100,
            'image':          self.image or '',
            'input_from':     self.input_from,
            'is_verified':    self.is_verified or False,
            'sync_id':        self.sync_id or '',
        }


class WaktuMakan(db.Model):
    __tablename__ = 'waktu_makan'

    id          = db.Column(db.Integer,     primary_key=True)
    waktu_makan = db.Column(db.String(50),  nullable=False)
    food_id     = db.Column(db.Integer,     db.ForeignKey('food.id'), nullable=False)
    user_id     = db.Column(db.Integer,     db.ForeignKey('user.id'), nullable=False)
    tanggal     = db.Column(db.Date,        default=lambda: now_utc().date())
    # ── NEW (Phase 1) ──
    catatan     = db.Column(db.String(255), nullable=True)
    sync_id     = db.Column(db.String(36),  default=gen_uuid)
    created_at  = db.Column(db.DateTime,    default=now_utc)
    updated_at  = db.Column(db.DateTime,    default=now_utc, onupdate=now_utc)
    porsi       = db.Column(db.Integer,     nullable=True, default=1)
    deleted_at  = db.Column(db.DateTime,    nullable=True)

    food = db.relationship('Food', backref='waktu_makan_entries', lazy=True)
    user = db.relationship('User', backref='waktu_makan_entries', lazy=True)

    def to_dict(self):
        return {
            'id':          self.id,
            'waktu_makan': self.waktu_makan,
            'tanggal':     str(self.tanggal),
            'catatan':     self.catatan or '',
            'sync_id':     self.sync_id or '',
            'food':        self.food.to_dict() if self.food else {},
        }


class Laporan(db.Model):
    __tablename__ = 'laporan'

    id            = db.Column(db.Integer,   primary_key=True)
    user_id       = db.Column(db.Integer,   db.ForeignKey('user.id'), nullable=False)
    food_id       = db.Column(db.Integer,   db.ForeignKey('food.id', name='fk_laporan_food_id'), nullable=True)
    waktu_makan   = db.Column(db.String(50), nullable=False)
    tanggal       = db.Column(db.DateTime,  default=now_utc)
    total_protein = db.Column(db.Integer,   nullable=False)
    total_kalori  = db.Column(db.Integer,   nullable=False)
    # ── NEW (Phase 1) ──
    total_karbo   = db.Column(db.Integer,   nullable=True, default=0)
    total_lemak   = db.Column(db.Integer,   nullable=True, default=0)
    sync_id       = db.Column(db.String(36), default=gen_uuid)
    created_at    = db.Column(db.DateTime,  default=now_utc)

    food = db.relationship('Food', backref='laporan', lazy=True)
    user = db.relationship('User', backref='laporan', lazy=True)

    def to_dict(self):
        return {
            'id':            self.id,
            'waktu_makan':   self.waktu_makan,
            'tanggal':       self.tanggal.strftime('%Y-%m-%dT%H:%M:%S'),
            'total_protein': self.total_protein,
            'total_kalori':  self.total_kalori,
            'total_karbo':   self.total_karbo or 0,
            'total_lemak':   self.total_lemak or 0,
            'sync_id':       self.sync_id or '',
        }


# ── NEW TABLES (Phase 1) ──────────────────────────────────

class WeightHistory(db.Model):
    """Riwayat berat badan harian untuk body tracker."""
    __tablename__ = 'weight_history'

    id         = db.Column(db.Integer,     primary_key=True)
    user_id    = db.Column(db.Integer,     db.ForeignKey('user.id'), nullable=False)
    bb         = db.Column(db.Float,       nullable=False)
    tanggal    = db.Column(db.Date,        default=lambda: now_utc().date())
    catatan    = db.Column(db.String(255), nullable=True)
    sync_id    = db.Column(db.String(36),  default=gen_uuid, unique=True)
    created_at = db.Column(db.DateTime,   default=now_utc)
    deleted_at = db.Column(db.DateTime,   nullable=True)

    user = db.relationship('User', backref='weight_history', lazy=True)

    def to_dict(self):
        return {
            'id':       self.id,
            'bb':       self.bb,
            'tanggal':  str(self.tanggal),
            'catatan':  self.catatan or '',
            'sync_id':  self.sync_id or '',
        }


class WaterLog(db.Model):
    """Log asupan air minum harian."""
    __tablename__ = 'water_log'

    id          = db.Column(db.Integer,  primary_key=True)
    user_id     = db.Column(db.Integer,  db.ForeignKey('user.id'), nullable=False)
    ml          = db.Column(db.Integer,  nullable=False)
    tanggal     = db.Column(db.Date,     default=lambda: now_utc().date())
    waktu_input = db.Column(db.DateTime, default=now_utc)
    sync_id     = db.Column(db.String(36), default=gen_uuid, unique=True)
    created_at  = db.Column(db.DateTime, default=now_utc)
    deleted_at  = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref='water_logs', lazy=True)

    def to_dict(self):
        return {
            'id':          self.id,
            'ml':          self.ml,
            'tanggal':     str(self.tanggal),
            'waktu_input': self.waktu_input.strftime('%H:%M') if self.waktu_input else '',
            'sync_id':     self.sync_id or '',
        }


class MealTemplate(db.Model):
    """Template / preset kombinasi makanan favorit user."""
    __tablename__ = 'meal_template'

    id          = db.Column(db.Integer,     primary_key=True)
    user_id     = db.Column(db.Integer,     db.ForeignKey('user.id'), nullable=False)
    nama        = db.Column(db.String(120), nullable=False)
    deskripsi   = db.Column(db.String(255), nullable=True)
    sync_id     = db.Column(db.String(36),  default=gen_uuid, unique=True)
    created_at  = db.Column(db.DateTime,    default=now_utc)
    updated_at  = db.Column(db.DateTime,    default=now_utc, onupdate=now_utc)
    deleted_at  = db.Column(db.DateTime,    nullable=True)

    user  = db.relationship('User', backref='meal_templates', lazy=True)
    items = db.relationship('MealTemplateItem', backref='template', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':        self.id,
            'nama':      self.nama,
            'deskripsi': self.deskripsi or '',
            'items':     [i.to_dict() for i in self.items if not i.deleted_at],
            'sync_id':   self.sync_id or '',
        }


class MealTemplateItem(db.Model):
    """Item dalam satu meal template."""
    __tablename__ = 'meal_template_item'

    id          = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('meal_template.id'), nullable=False)
    food_id     = db.Column(db.Integer, db.ForeignKey('food.id'), nullable=False)
    porsi       = db.Column(db.Integer, default=1)
    sync_id     = db.Column(db.String(36), default=gen_uuid, unique=True)
    created_at  = db.Column(db.DateTime,  default=now_utc)
    deleted_at  = db.Column(db.DateTime,  nullable=True)

    food = db.relationship('Food', lazy=True)

    def to_dict(self):
        return {
            'id':      self.id,
            'food':    self.food.to_dict() if self.food else {},
            'porsi':   self.porsi,
            'sync_id': self.sync_id or '',
        }


class StreakLog(db.Model):
    """Satu record per hari per user — untuk kalkulasi streak input makanan."""
    __tablename__ = 'streak_log'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tanggal    = db.Column(db.Date,    nullable=False)
    sync_id    = db.Column(db.String(36), default=gen_uuid)
    created_at = db.Column(db.DateTime,  default=now_utc)

    __table_args__ = (db.UniqueConstraint('user_id', 'tanggal', name='uq_streak_user_date'),)

    user = db.relationship('User', backref='streak_logs', lazy=True)


# ─────────────────────────────────────────────────────────
#  SAFE MIGRATION (tambah kolom baru ke tabel existing)
#  Aman dijalankan berulang kali — idempotent
# ─────────────────────────────────────────────────────────
def run_safe_migrations():
    """
    Tambahkan kolom baru ke tabel existing tanpa merusak data.
    Menggunakan raw SQL dengan try/except per kolom.
    """
    migrations = [
        # Format: (table, column, column_def)
        # ── user ──
        ('user', 'sync_id',    "VARCHAR(36)"),
        ('user', 'created_at', "DATETIME"),
        ('user', 'updated_at', "DATETIME"),
        ('user', 'deleted_at', "DATETIME"),
        # ── food ──
        ('food', 'karbo',          "INTEGER DEFAULT 0"),
        ('food', 'lemak',          "INTEGER DEFAULT 0"),
        ('food', 'serat',          "INTEGER DEFAULT 0"),
        ('food', 'gram_per_porsi', "INTEGER DEFAULT 100"),
        ('food', 'is_verified',    "BOOLEAN DEFAULT 0"),
        ('food', 'sync_id',        "VARCHAR(36)"),
        ('food', 'created_at',     "DATETIME"),
        ('food', 'updated_at',     "DATETIME"),
        ('food', 'deleted_at',     "DATETIME"),
        # ── waktu_makan ──
        ('waktu_makan', 'porsi',      "INTEGER DEFAULT 1"),
        ('waktu_makan', 'catatan',    "VARCHAR(255)"),
        ('waktu_makan', 'sync_id',    "VARCHAR(36)"),
        ('waktu_makan', 'created_at', "DATETIME"),
        ('waktu_makan', 'updated_at', "DATETIME"),
        ('waktu_makan', 'deleted_at', "DATETIME"),
        # ── laporan ──
        ('laporan', 'total_karbo', "INTEGER DEFAULT 0"),
        ('laporan', 'total_lemak', "INTEGER DEFAULT 0"),
        ('laporan', 'sync_id',     "VARCHAR(36)"),
        ('laporan', 'created_at',  "DATETIME"),
    ]

    conn = db.engine.raw_connection()
    try:
        cur = conn.cursor()
        for table, column, col_def in migrations:
            try:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
                conn.commit()
                print(f"  ✓ Added: {table}.{column}")
            except Exception:
                pass  # Kolom sudah ada, skip

        # Isi sync_id untuk baris existing yang NULL
        for table in ['user', 'food', 'waktu_makan', 'laporan']:
            try:
                cur.execute(f"SELECT id FROM {table} WHERE sync_id IS NULL LIMIT 1")
                if cur.fetchone():
                    cur.execute(f"SELECT id FROM {table} WHERE sync_id IS NULL")
                    ids = [row[0] for row in cur.fetchall()]
                    for rid in ids:
                        cur.execute(
                            f"UPDATE {table} SET sync_id=? WHERE id=?",
                            (str(uuid.uuid4()), rid)
                        )
                    conn.commit()
                    print(f"  ✓ Filled sync_id for {len(ids)} rows in {table}")
            except Exception as e:
                print(f"  ⚠ sync_id fill error ({table}): {e}")

    finally:
        conn.close()


# ─────────────────────────────────────────────────────────
#  HELPERS NUTRISI
# ─────────────────────────────────────────────────────────
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
    else:  # maintain
        return int(round(tdee)), int(round(user.bb * 2.0))


def get_current_user():
    """Helper: ambil user dari JWT identity."""
    return db.session.get(User, int(get_jwt_identity()))


def record_streak(user_id: int, tanggal: date):
    """Catat tanggal input ke streak_log (ignore duplicate)."""
    try:
        existing = StreakLog.query.filter_by(user_id=user_id, tanggal=tanggal).first()
        if not existing:
            db.session.add(StreakLog(user_id=user_id, tanggal=tanggal))
            db.session.commit()
    except Exception:
        db.session.rollback()


def calc_streak(user_id: int) -> dict:
    """Hitung streak aktif dan streak terpanjang."""
    logs = StreakLog.query.filter_by(user_id=user_id)\
        .order_by(StreakLog.tanggal.desc()).all()
    dates = sorted({l.tanggal for l in logs}, reverse=True)

    if not dates:
        return {'current': 0, 'longest': 0, 'last_input': None}

    today = now_utc().date()
    current = 0
    # Mulai hitung dari hari ini atau kemarin
    check = today
    if dates[0] < today - timedelta(days=1):
        current = 0
    else:
        for d in dates:
            if d == check or d == check - timedelta(days=1):
                current += 1
                check = d
            else:
                break

    # Hitung terpanjang
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
#  DB INIT + MIGRATION
# ─────────────────────────────────────────────────────────
with app.app_context():
    db.create_all()
    print("Running safe migrations...")
    run_safe_migrations()
    print("Database ready ✓")


# ═════════════════════════════════════════════════════════
#  ENDPOINTS
# ═════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────
#  AUTH
# ─────────────────────────────────────────────────────────
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Body request kosong'}), 400

        required = ['username', 'password', 'umur', 'tb', 'bb', 'gender', 'aktivitas', 'tujuan', 'body_type']
        for field in required:
            if field not in data or not str(data[field]).strip():
                return jsonify({'error': f'Field {field} wajib diisi'}), 400

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
        user = User(
            username   = data['username'],
            password   = generate_password_hash(data['password']),
            umur=umur, tb=tb, bb=bb,
            tujuan     = data['tujuan'],
            aktivitas  = data['aktivitas'],
            gender     = data['gender'],
            tipe_tubuh = data['body_type'],   # frontend kirim 'body_type', DB simpan 'tipe_tubuh'
            bmr=bmr, tdee=tdee,
        )
        db.session.add(user)
        db.session.commit()

        # Catat berat awal di weight history
        db.session.add(WeightHistory(user_id=user.id, bb=bb, catatan='Berat awal registrasi'))
        db.session.commit()

        token = create_access_token(identity=str(user.id))
        return jsonify({'token': token, 'user': user.to_dict()}), 201

    except ValueError:
        return jsonify({'error': 'Format angka tidak valid'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data     = request.get_json() or {}
        username = (data.get('username') or '').strip()
        password = (data.get('password') or '').strip()
        if not username or not password:
            return jsonify({'error': 'Username dan password wajib diisi'}), 400

        user = User.query.filter_by(username=username).filter(User.deleted_at.is_(None)).first()
        if not user or not check_password_hash(user.password, password):
            return jsonify({'error': 'Username atau password salah'}), 401

        token = create_access_token(identity=str(user.id))
        return jsonify({'token': token, 'user': user.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────────────
#  PROFILE
# ─────────────────────────────────────────────────────────
@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User tidak ditemukan'}), 404
    return jsonify(user.to_dict()), 200


@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User tidak ditemukan'}), 404

    data = request.get_json() or {}
    old_bb = user.bb

    # Validasi range jika dikirim
    if 'umur' in data and not (10 <= int(data['umur']) <= 100):
        return jsonify({'error': 'Umur harus antara 10–100 tahun'}), 400
    if 'tb' in data and not (100 <= int(data['tb']) <= 250):
        return jsonify({'error': 'Tinggi badan harus antara 100–250 cm'}), 400
    if 'bb' in data and not (30 <= int(data['bb']) <= 300):
        return jsonify({'error': 'Berat badan harus antara 30–300 kg'}), 400

    for field in ['umur', 'tb', 'bb', 'tujuan', 'aktivitas', 'tipe_tubuh', 'gender']:
        if field in data:
            setattr(user, field, data[field])

    user.bmr, user.tdee = hitung_bmr_tdee(
        user.bb, user.tb, user.umur, user.gender, user.aktivitas, user.tipe_tubuh
    )

    # Jika bb berubah, catat di WeightHistory
    if 'bb' in data and int(data['bb']) != old_bb:
        db.session.add(WeightHistory(
            user_id = user.id,
            bb      = user.bb,
            catatan = data.get('catatan_berat', ''),
        ))

    db.session.commit()
    return jsonify(user.to_dict()), 200


@app.route('/api/profile/password', methods=['PUT'])
@jwt_required()
def update_password():
    """Ganti password user."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User tidak ditemukan'}), 404

    data = request.get_json() or {}
    old_pw  = data.get('password_lama', '')
    new_pw  = data.get('password_baru', '')
    confirm = data.get('konfirmasi', '')

    if not old_pw or not new_pw:
        return jsonify({'error': 'Password lama dan baru wajib diisi'}), 400
    if not check_password_hash(user.password, old_pw):
        return jsonify({'error': 'Password lama tidak sesuai'}), 400
    if len(new_pw) < 6:
        return jsonify({'error': 'Password baru minimal 6 karakter'}), 400
    if confirm and new_pw != confirm:
        return jsonify({'error': 'Konfirmasi password tidak cocok'}), 400

    user.password = generate_password_hash(new_pw)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Password berhasil diubah'}), 200


@app.route('/api/profile/picture', methods=['POST'])
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

    user.profile_picture = public_url
    db.session.commit()
    return jsonify({'profile_picture_url': public_url}), 200


# ─────────────────────────────────────────────────────────
#  FOOD DATABASE
# ─────────────────────────────────────────────────────────
@app.route('/api/foods', methods=['GET'])
@jwt_required()
def get_foods():
    q     = request.args.get('q', '').strip()
    page  = max(int(request.args.get('page',  1)), 1)
    limit = min(int(request.args.get('limit', 20)), 100)

    query = Food.query.filter_by(input_from='tambah data').filter(Food.deleted_at.is_(None))
    if q:
        query = query.filter(Food.nama_makanan.ilike(f'%{q}%'))

    total  = query.count()
    foods  = query.order_by(Food.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'data':       [f.to_dict() for f in foods],
        'total':      total,
        'page':       page,
        'limit':      limit,
        'total_pages': (total + limit - 1) // limit,
    }), 200


@app.route('/api/foods', methods=['POST'])
@jwt_required()
def add_food():
    user         = get_current_user()
    nama_makanan = request.form.get('nama_makanan', '').strip()
    if not nama_makanan:
        return jsonify({'error': 'Nama makanan wajib diisi'}), 400

    # Cek duplikat
    existing = Food.query.filter(
        Food.nama_makanan.ilike(nama_makanan),
        Food.input_from == 'tambah data',
        Food.deleted_at.is_(None),
    ).first()
    if existing:
        return jsonify({'error': 'Makanan dengan nama ini sudah ada di database'}), 409

    protein = safe_int(request.form.get('protein', 0))
    kalori  = safe_int(request.form.get('kalori', 0))

    if kalori <= 0 or protein < 0:
        return jsonify({'error': 'Kalori harus > 0, protein tidak boleh negatif'}), 400

    image_url = None
    if 'food_image' in request.files:
        file = request.files['food_image']
        if file and allowed_file(file.filename):
            image_url = upload_to_supabase(file.read(), secure_filename(file.filename), bucket='foods')

    food = Food(
        nama_makanan   = nama_makanan,
        protein        = protein,
        kalori         = kalori,
        karbo          = safe_int(request.form.get('karbo', 0)),
        lemak          = safe_int(request.form.get('lemak', 0)),
        serat          = safe_int(request.form.get('serat', 0)),
        gram_per_porsi = safe_int(request.form.get('gram_per_porsi', 100)),
        image          = image_url,
        user_id        = user.id,
        input_from     = 'tambah data',
    )
    db.session.add(food)
    db.session.commit()
    return jsonify(food.to_dict()), 201


@app.route('/api/foods/<int:food_id>', methods=['PUT'])
@jwt_required()
def update_food(food_id):
    """Edit makanan — hanya oleh yang menambahkan, atau semua user (komunal)."""
    food = Food.query.filter_by(id=food_id, input_from='tambah data').filter(Food.deleted_at.is_(None)).first()
    if not food:
        return jsonify({'error': 'Makanan tidak ditemukan'}), 404

    data = request.get_json() or {}
    for field in ['nama_makanan', 'protein', 'kalori', 'karbo', 'lemak', 'serat', 'gram_per_porsi']:
        if field in data:
            setattr(food, field, data[field])

    db.session.commit()
    return jsonify(food.to_dict()), 200


# ─────────────────────────────────────────────────────────
#  INPUT HARIAN
# ─────────────────────────────────────────────────────────
@app.route('/api/daily', methods=['GET'])
@jwt_required()
def get_daily():
    user     = get_current_user()
    date_str = request.args.get('date', str(now_utc().date()))
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        target_date = now_utc().date()

    entries = WaktuMakan.query.join(Food).filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == target_date,
        WaktuMakan.deleted_at.is_(None),
        Food.input_from       == 'input makanan',
    ).all()

    grouped = {'Pagi': [], 'Siang': [], 'Sore': [], 'Malam': []}
    for e in entries:
        if e.waktu_makan in grouped:
            grouped[e.waktu_makan].append(e.to_dict())

    total_protein = sum(e.food.protein for e in entries)
    total_kalori  = sum(e.food.kalori  for e in entries)
    target_cal, target_prot = get_targets(user)

    return jsonify({
        'grouped':          grouped,
        'total_protein':    total_protein,
        'total_kalori':     total_kalori,
        'target_kalori':    target_cal,
        'target_protein':   target_prot,
        'progress_kalori':  min(round((total_kalori  / target_cal)  * 100, 1), 100) if target_cal  else 0,
        'progress_protein': min(round((total_protein / target_prot) * 100, 1), 100) if target_prot else 0,
        'sisa_kalori':      max(target_cal  - total_kalori,  0),
        'sisa_protein':     max(target_prot - total_protein, 0),
    }), 200


@app.route('/api/daily', methods=['POST'])
@jwt_required()
def submit_daily():
    user  = get_current_user()
    data  = request.get_json()
    today = now_utc().date()

    if not data or not isinstance(data, list):
        return jsonify({'error': 'Data harus berupa array JSON'}), 400

    added = 0
    for item in data:
        required_fields = ['nama_makanan', 'porsi', 'protein', 'kalori', 'waktu_makan']
        if not all(k in item for k in required_fields):
            continue

        # protein & kalori yang diterima SUDAH termasuk perkalian porsi (dari frontend)
        # TIDAK dikali lagi di sini atau di laporan
        food = Food(
            nama_makanan = item['nama_makanan'],
            porsi        = int(item['porsi']),
            protein      = safe_int(item['protein']),
            kalori       = safe_int(item['kalori']),
            karbo        = safe_int(item.get('karbo', 0)),
            lemak        = safe_int(item.get('lemak', 0)),
            user_id      = user.id,
            input_from   = 'input makanan',
            image        = item.get('image', ''),
        )
        db.session.add(food)
        db.session.flush()
        db.session.add(WaktuMakan(
            waktu_makan = item['waktu_makan'],
            food_id     = food.id,
            user_id     = user.id,
            tanggal     = today,
            catatan     = item.get('catatan', ''),
        ))
        added += 1

    db.session.commit()

    # Catat ke streak
    record_streak(user.id, today)

    return jsonify({'status': 'success', 'added': added}), 200


@app.route('/api/daily/<int:waktu_makan_id>', methods=['DELETE'])
@jwt_required()
def delete_daily(waktu_makan_id):
    user  = get_current_user()
    entry = WaktuMakan.query.filter_by(id=waktu_makan_id, user_id=user.id).first()
    if not entry:
        return jsonify({'error': 'Data tidak ditemukan'}), 404

    # Soft delete entry
    entry.deleted_at = now_utc()
    # Hard delete food log (bukan food database)
    food = entry.food
    if food and food.input_from == 'input makanan':
        db.session.delete(food)
    db.session.commit()
    return jsonify({'status': 'success'}), 200


@app.route('/api/daily/<int:waktu_makan_id>', methods=['PUT'])
@jwt_required()
def edit_daily(waktu_makan_id):
    """Edit catatan / waktu_makan dari satu entry. Untuk ganti makanan, delete + tambah baru."""
    user  = get_current_user()
    entry = WaktuMakan.query.filter_by(id=waktu_makan_id, user_id=user.id).filter(
        WaktuMakan.deleted_at.is_(None)
    ).first()
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
@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    user  = get_current_user()
    today = now_utc().date()

    def qw(waktu):
        return WaktuMakan.query.join(Food).filter(
            WaktuMakan.waktu_makan == waktu,
            WaktuMakan.user_id     == user.id,
            WaktuMakan.tanggal     == today,
            WaktuMakan.deleted_at.is_(None),
            Food.input_from        == 'input makanan',
        ).all()

    pagi, siang, sore, malam = qw('Pagi'), qw('Siang'), qw('Sore'), qw('Malam')

    def calc(lst):
        return (
            sum(w.food.protein or 0 for w in lst),
            sum(w.food.kalori  or 0 for w in lst),
        )

    pp, kp   = calc(pagi)
    ps, ks   = calc(siang)
    pso, kso = calc(sore)
    pm, km   = calc(malam)

    total_protein = pp + ps + pso + pm
    total_kalori  = kp + ks + kso + km
    target_cal, target_prot = get_targets(user)

    # Streak info
    streak = calc_streak(user.id)

    return jsonify({
        'user':             user.to_dict(),
        'bmr':              int(round(user.bmr  or 0)),
        'tdee':             int(round(user.tdee or 0)),
        'target_kalori':    target_cal,
        'target_protein':   target_prot,
        'total_kalori':     total_kalori,
        'total_protein':    total_protein,
        'sisa_kalori':      max(target_cal  - total_kalori,  0),
        'sisa_protein':     max(target_prot - total_protein, 0),
        'progress_kalori':  min(round((total_kalori  / target_cal)  * 100, 1), 100) if target_cal  else 0,
        'progress_protein': min(round((total_protein / target_prot) * 100, 1), 100) if target_prot else 0,
        'streak':           streak,
        'per_waktu': {
            'Pagi':  {'items': [w.to_dict() for w in pagi],  'protein': pp,  'kalori': kp},
            'Siang': {'items': [w.to_dict() for w in siang], 'protein': ps,  'kalori': ks},
            'Sore':  {'items': [w.to_dict() for w in sore],  'protein': pso, 'kalori': kso},
            'Malam': {'items': [w.to_dict() for w in malam], 'protein': pm,  'kalori': km},
        },
    }), 200


# ─────────────────────────────────────────────────────────
#  LAPORAN
# ─────────────────────────────────────────────────────────
@app.route('/api/laporan', methods=['GET'])
@jwt_required()
def get_laporan():
    user = get_current_user()
    page  = max(int(request.args.get('page', 1)), 1)
    limit = min(int(request.args.get('limit', 30)), 90)

    query  = Laporan.query.filter_by(user_id=user.id).order_by(Laporan.tanggal.desc())
    total  = query.count()
    data   = query.offset((page - 1) * limit).limit(limit).all()

    target_cal, target_prot = get_targets(user)
    avg_protein = round(sum(l.total_protein for l in data) / len(data)) if data else 0
    avg_kalori  = round(sum(l.total_kalori  for l in data) / len(data)) if data else 0

    return jsonify({
        'laporan':        [l.to_dict() for l in data],
        'avg_protein':    avg_protein,
        'avg_kalori':     avg_kalori,
        'target_kalori':  target_cal,
        'target_protein': target_prot,
        'total':          total,
        'page':           page,
        'limit':          limit,
    }), 200


@app.route('/api/laporan', methods=['POST'])
@jwt_required()
def buat_laporan():
    user  = get_current_user()
    today = now_utc().date()

    entries = WaktuMakan.query.join(Food).filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == today,
        WaktuMakan.deleted_at.is_(None),
        Food.input_from       == 'input makanan',
    ).all()

    if not entries:
        return jsonify({'error': 'Belum ada input makanan hari ini'}), 400

    # ✅ FIX: protein & kalori di food log sudah include perkalian porsi
    # TIDAK dikali porsi lagi — bug sebelumnya: protein * porsi = double multiply
    total_protein = sum(w.food.protein for w in entries)
    total_kalori  = sum(w.food.kalori  for w in entries)
    total_karbo   = sum(w.food.karbo or 0 for w in entries)
    total_lemak   = sum(w.food.lemak or 0 for w in entries)

    laporan = Laporan(
        user_id       = user.id,
        waktu_makan   = 'Hari Ini',
        total_protein = total_protein,
        total_kalori  = total_kalori,
        total_karbo   = total_karbo,
        total_lemak   = total_lemak,
        tanggal       = now_utc(),
    )
    db.session.add(laporan)
    db.session.commit()
    return jsonify(laporan.to_dict()), 201


@app.route('/api/laporan/reset', methods=['POST'])
@jwt_required()
def reset_and_report():
    user  = get_current_user()
    today = now_utc().date()

    entries = WaktuMakan.query.join(Food).filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == today,
        WaktuMakan.deleted_at.is_(None),
        Food.input_from       == 'input makanan',
    ).all()

    if not entries:
        return jsonify({'status': 'no_data', 'message': 'Tidak ada data hari ini'}), 200

    # ✅ FIX: sama — tidak dikali porsi lagi
    total_protein = sum(w.food.protein for w in entries)
    total_kalori  = sum(w.food.kalori  for w in entries)
    total_karbo   = sum(w.food.karbo or 0 for w in entries)
    total_lemak   = sum(w.food.lemak or 0 for w in entries)

    laporan = Laporan(
        user_id       = user.id,
        waktu_makan   = 'Hari Ini',
        total_protein = total_protein,
        total_kalori  = total_kalori,
        total_karbo   = total_karbo,
        total_lemak   = total_lemak,
        tanggal       = now_utc(),
    )
    db.session.add(laporan)

    for w in entries:
        if w.food and w.food.input_from == 'input makanan':
            db.session.delete(w.food)
        db.session.delete(w)

    db.session.commit()
    return jsonify({'status': 'success', 'laporan': laporan.to_dict()}), 200


# ─────────────────────────────────────────────────────────
#  WEIGHT TRACKER
# ─────────────────────────────────────────────────────────
@app.route('/api/weight', methods=['GET'])
@jwt_required()
def get_weight():
    user  = get_current_user()
    limit = min(int(request.args.get('limit', 30)), 365)
    data  = WeightHistory.query.filter_by(user_id=user.id)\
        .filter(WeightHistory.deleted_at.is_(None))\
        .order_by(WeightHistory.tanggal.desc())\
        .limit(limit).all()

    records = [r.to_dict() for r in data]
    return jsonify({
        'data':    records,
        'current': records[0]['bb'] if records else user.bb,
        'initial': records[-1]['bb'] if records else user.bb,
        'change':  round(records[0]['bb'] - records[-1]['bb'], 1) if len(records) > 1 else 0,
    }), 200


@app.route('/api/weight', methods=['POST'])
@jwt_required()
def add_weight():
    user = get_current_user()
    data = request.get_json() or {}
    bb   = data.get('bb')

    if bb is None or not (30 <= float(bb) <= 300):
        return jsonify({'error': 'Berat badan harus antara 30–300 kg'}), 400

    today = now_utc().date()
    # Satu entry per hari — update jika sudah ada
    existing = WeightHistory.query.filter_by(user_id=user.id, tanggal=today)\
        .filter(WeightHistory.deleted_at.is_(None)).first()
    if existing:
        existing.bb      = float(bb)
        existing.catatan = data.get('catatan', existing.catatan)
    else:
        db.session.add(WeightHistory(
            user_id = user.id,
            bb      = float(bb),
            catatan = data.get('catatan', ''),
        ))

    # Update bb di user juga
    user.bb = int(round(float(bb)))
    user.bmr, user.tdee = hitung_bmr_tdee(
        user.bb, user.tb, user.umur, user.gender, user.aktivitas, user.tipe_tubuh
    )
    db.session.commit()
    return jsonify({'status': 'success', 'bb': float(bb)}), 201


# ─────────────────────────────────────────────────────────
#  WATER TRACKER
# ─────────────────────────────────────────────────────────
@app.route('/api/water/today', methods=['GET'])
@jwt_required()
def get_water_today():
    user  = get_current_user()
    today = now_utc().date()
    logs  = WaterLog.query.filter_by(user_id=user.id, tanggal=today)\
        .filter(WaterLog.deleted_at.is_(None)).all()
    total_ml = sum(l.ml for l in logs)
    target   = int(user.bb * 33)  # 33ml per kg berat badan

    return jsonify({
        'logs':     [l.to_dict() for l in logs],
        'total_ml': total_ml,
        'target_ml': target,
        'progress': min(round((total_ml / target) * 100, 1), 100) if target else 0,
        'sisa_ml':  max(target - total_ml, 0),
    }), 200


@app.route('/api/water', methods=['POST'])
@jwt_required()
def add_water():
    user = get_current_user()
    data = request.get_json() or {}
    ml   = data.get('ml', 250)

    if not (50 <= int(ml) <= 2000):
        return jsonify({'error': 'Volume air harus antara 50–2000 ml per input'}), 400

    db.session.add(WaterLog(user_id=user.id, ml=int(ml)))
    db.session.commit()
    return jsonify({'status': 'success', 'ml': int(ml)}), 201


# ─────────────────────────────────────────────────────────
#  STREAK
# ─────────────────────────────────────────────────────────
@app.route('/api/streak', methods=['GET'])
@jwt_required()
def get_streak():
    user   = get_current_user()
    streak = calc_streak(user.id)
    return jsonify(streak), 200


# ─────────────────────────────────────────────────────────
#  MEAL TEMPLATES
# ─────────────────────────────────────────────────────────
@app.route('/api/templates', methods=['GET'])
@jwt_required()
def get_templates():
    user      = get_current_user()
    templates = MealTemplate.query.filter_by(user_id=user.id)\
        .filter(MealTemplate.deleted_at.is_(None))\
        .order_by(MealTemplate.created_at.desc()).all()
    return jsonify([t.to_dict() for t in templates]), 200


@app.route('/api/templates', methods=['POST'])
@jwt_required()
def create_template():
    user = get_current_user()
    data = request.get_json() or {}
    nama = (data.get('nama') or '').strip()

    if not nama:
        return jsonify({'error': 'Nama template wajib diisi'}), 400

    template = MealTemplate(
        user_id   = user.id,
        nama      = nama,
        deskripsi = data.get('deskripsi', ''),
    )
    db.session.add(template)
    db.session.flush()

    for item in data.get('items', []):
        food = Food.query.filter_by(id=item.get('food_id'), input_from='tambah data').first()
        if food:
            db.session.add(MealTemplateItem(
                template_id = template.id,
                food_id     = food.id,
                porsi       = int(item.get('porsi', 1)),
            ))

    db.session.commit()
    return jsonify(template.to_dict()), 201


@app.route('/api/templates/<int:template_id>', methods=['DELETE'])
@jwt_required()
def delete_template(template_id):
    user     = get_current_user()
    template = MealTemplate.query.filter_by(id=template_id, user_id=user.id)\
        .filter(MealTemplate.deleted_at.is_(None)).first()
    if not template:
        return jsonify({'error': 'Template tidak ditemukan'}), 404

    template.deleted_at = now_utc()
    db.session.commit()
    return jsonify({'status': 'success'}), 200


@app.route('/api/templates/<int:template_id>/use', methods=['POST'])
@jwt_required()
def use_template(template_id):
    """Gunakan template → langsung tambahkan semua item ke daily log."""
    user     = get_current_user()
    template = MealTemplate.query.filter_by(id=template_id, user_id=user.id)\
        .filter(MealTemplate.deleted_at.is_(None)).first()
    if not template:
        return jsonify({'error': 'Template tidak ditemukan'}), 404

    data        = request.get_json() or {}
    waktu_makan = data.get('waktu_makan', 'Pagi')
    today       = now_utc().date()

    added = 0
    for titem in template.items:
        if titem.deleted_at or not titem.food:
            continue
        food_src = titem.food
        food_log = Food(
            nama_makanan = food_src.nama_makanan,
            porsi        = titem.porsi,
            protein      = food_src.protein * titem.porsi,
            kalori       = food_src.kalori  * titem.porsi,
            karbo        = (food_src.karbo or 0) * titem.porsi,
            lemak        = (food_src.lemak or 0) * titem.porsi,
            user_id      = user.id,
            input_from   = 'input makanan',
            image        = food_src.image or '',
        )
        db.session.add(food_log)
        db.session.flush()
        db.session.add(WaktuMakan(
            waktu_makan = waktu_makan,
            food_id     = food_log.id,
            user_id     = user.id,
            tanggal     = today,
        ))
        added += 1

    db.session.commit()
    record_streak(user.id, today)
    return jsonify({'status': 'success', 'added': added}), 200


# ─────────────────────────────────────────────────────────
#  SYNC (Offline → Online)
# ─────────────────────────────────────────────────────────
@app.route('/api/sync/push', methods=['POST'])
@jwt_required()
def sync_push():
    """
    Mobile kirim data yang dibuat/diubah saat offline.
    Payload: { "food_logs": [...], "weight_logs": [...], "water_logs": [...] }
    Conflict resolution: updated_at terbaru menang.
    """
    user = get_current_user()
    data = request.get_json() or {}

    synced = {'food_logs': 0, 'weight_logs': 0, 'water_logs': 0}

    # Sync food logs (WaktuMakan + Food)
    for item in data.get('food_logs', []):
        sync_id = item.get('sync_id')
        if not sync_id:
            continue
        existing = WaktuMakan.query.filter_by(sync_id=sync_id).first()
        if existing:
            continue  # Sudah ada, skip (server is source of truth after initial push)

        # Buat food log baru
        food_log = Food(
            nama_makanan = item.get('nama_makanan', ''),
            porsi        = int(item.get('porsi', 1)),
            protein      = safe_int(item.get('protein', 0)),
            kalori       = safe_int(item.get('kalori', 0)),
            karbo        = safe_int(item.get('karbo', 0)),
            lemak        = safe_int(item.get('lemak', 0)),
            user_id      = user.id,
            input_from   = 'input makanan',
        )
        db.session.add(food_log)
        db.session.flush()

        tanggal_str = item.get('tanggal', str(now_utc().date()))
        try:
            tanggal = datetime.strptime(tanggal_str, '%Y-%m-%d').date()
        except ValueError:
            tanggal = now_utc().date()

        wm = WaktuMakan(
            waktu_makan = item.get('waktu_makan', 'Pagi'),
            food_id     = food_log.id,
            user_id     = user.id,
            tanggal     = tanggal,
            sync_id     = sync_id,
        )
        db.session.add(wm)
        synced['food_logs'] += 1

    # Sync weight logs
    for item in data.get('weight_logs', []):
        sync_id = item.get('sync_id')
        if not sync_id:
            continue
        if WeightHistory.query.filter_by(sync_id=sync_id).first():
            continue
        tanggal_str = item.get('tanggal', str(now_utc().date()))
        try:
            tanggal = datetime.strptime(tanggal_str, '%Y-%m-%d').date()
        except ValueError:
            tanggal = now_utc().date()
        db.session.add(WeightHistory(
            user_id = user.id,
            bb      = float(item.get('bb', user.bb)),
            tanggal = tanggal,
            catatan = item.get('catatan', ''),
            sync_id = sync_id,
        ))
        synced['weight_logs'] += 1

    # Sync water logs
    for item in data.get('water_logs', []):
        sync_id = item.get('sync_id')
        if not sync_id:
            continue
        if WaterLog.query.filter_by(sync_id=sync_id).first():
            continue
        tanggal_str = item.get('tanggal', str(now_utc().date()))
        try:
            tanggal = datetime.strptime(tanggal_str, '%Y-%m-%d').date()
        except ValueError:
            tanggal = now_utc().date()
        db.session.add(WaterLog(
            user_id = user.id,
            ml      = int(item.get('ml', 250)),
            tanggal = tanggal,
            sync_id = sync_id,
        ))
        synced['water_logs'] += 1

    db.session.commit()
    return jsonify({'status': 'success', 'synced': synced}), 200


@app.route('/api/sync/pull', methods=['GET'])
@jwt_required()
def sync_pull():
    """
    Mobile ambil semua data yang berubah sejak last_sync.
    Query param: ?since=2024-01-01T00:00:00
    """
    user = get_current_user()
    since_str = request.args.get('since', '')
    try:
        since = datetime.fromisoformat(since_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        since = datetime.min.replace(tzinfo=timezone.utc)

    # Food logs sejak since
    food_logs = WaktuMakan.query.join(Food).filter(
        WaktuMakan.user_id   == user.id,
        Food.input_from      == 'input makanan',
        WaktuMakan.created_at >= since,
    ).all()

    weight_logs = WeightHistory.query.filter(
        WeightHistory.user_id    == user.id,
        WeightHistory.created_at >= since,
        WeightHistory.deleted_at.is_(None),
    ).all()

    water_logs = WaterLog.query.filter(
        WaterLog.user_id    == user.id,
        WaterLog.created_at >= since,
        WaterLog.deleted_at.is_(None),
    ).all()

    # Juga pull laporan
    laporan_list = Laporan.query.filter(
        Laporan.user_id    == user.id,
        Laporan.created_at >= since,
    ).order_by(Laporan.tanggal.desc()).limit(90).all()

    # Food database yang baru/update sejak since (untuk cache lokal HP)
    new_foods = Food.query.filter(
        Food.updated_at >= since,
        Food.deleted_at.is_(None),
    ).limit(200).all()

    return jsonify({
        'food_logs':   [wm.to_dict() for wm in food_logs],
        'weight_logs': [w.to_dict()  for w  in weight_logs],
        'water_logs':  [w.to_dict()  for w  in water_logs],
        'laporan':     [l.to_dict()  for l  in laporan_list],
        'foods':       [f.to_dict()  for f  in new_foods],
        'user':        user.to_dict(),
        'server_time': now_utc().isoformat(),
    }), 200


# ─────────────────────────────────────────────────────────
#  AI ENDPOINTS (Gemini — siap diisi)
# ─────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')


def call_gemini(prompt: str, image_base64: str = None) -> dict:
    """
    Helper untuk panggil Gemini API.
    Kembalikan dict dengan 'text' dan 'tts_text' (bersih untuk TTS).
    """
    if not GEMINI_API_KEY:
        raise RuntimeError('GEMINI_API_KEY belum diset di file .env')

    import urllib.request as urlreq
    import urllib.error   as urlerr

    # Model dan API version dibaca dari env — ubah di .env tanpa ganti kode
    model   = os.environ.get('GEMINI_MODEL',   'gemini-2.5-flash-preview-04-17')
    api_ver = os.environ.get('GEMINI_API_VER', 'v1alpha')
    endpoint = f'https://generativelanguage.googleapis.com/{api_ver}/models/{model}:generateContent?key={GEMINI_API_KEY}'

    parts = [{'text': prompt}]
    if image_base64:
        parts.append({'inline_data': {'mime_type': 'image/jpeg', 'data': image_base64}})

    payload = json.dumps({
        'contents': [{'parts': parts}],
        'generationConfig': {
            'temperature':     0.7,
            'maxOutputTokens': 1024,
        }
    }).encode()

    MAX_RETRIES = 3
    RETRY_DELAYS = [2, 5, 10]

    gemini_result = None
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            req = urlreq.Request(endpoint, data=payload, headers={'Content-Type': 'application/json'})
            with urlreq.urlopen(req, timeout=55) as resp:
                gemini_result = json.loads(resp.read())
            break

        except urlerr.HTTPError as http_err:
            err_body = http_err.read().decode('utf-8', errors='replace')
            app.logger.error(f'[VoiceCmd] Gemini HTTPError {http_err.code} (attempt {attempt+1}/{MAX_RETRIES}): {err_body[:300]}')
            last_error = f'HTTP error {http_err.code}: {err_body[:300]}'
            if http_err.code in (503, 429, 500) and attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
                continue
            raise RuntimeError(f'Gemini HTTP {http_err.code}: {err_body[:300]}')

        except urlerr.URLError as url_err:
            app.logger.error(f'[VoiceCmd] Gemini URLError (attempt {attempt+1}/{MAX_RETRIES}): {url_err.reason}')
            last_error = str(url_err)
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
                continue
            raise RuntimeError(f'Gemini koneksi gagal: {str(url_err.reason)}')

    if gemini_result is None:
        raise RuntimeError(last_error or 'Semua retry gagal')

    # Ambil teks dari response
    try:
        raw_text = gemini_result['candidates'][0]['content']['parts'][0]['text']
    except (KeyError, IndexError):
        raise RuntimeError(f'Gemini response tidak valid: {str(result)[:200]}')

    # Bersihkan untuk TTS: hapus markdown, emoji, bullet
    tts_text = re.sub(r'[*_`#\-•]', '', raw_text)
    tts_text = re.sub(r'[\U00010000-\U0010ffff]', '', tts_text, flags=re.UNICODE)
    tts_text = re.sub(r'\s+', ' ', tts_text).strip()

    return {'text': raw_text, 'tts_text': tts_text}



@app.route('/api/ai/test', methods=['GET'])
def ai_test():
    """Debug endpoint - cek apakah Gemini bisa dipanggil."""
    import urllib.request as urlreq
    import urllib.error   as urlerr

    # 1. Cek API key
    key = os.environ.get('GEMINI_API_KEY', '')
    if not key:
        return jsonify({
            'status': 'ERROR',
            'masalah': 'GEMINI_API_KEY tidak ditemukan di .env',
            'solusi': 'Tambahkan GEMINI_API_KEY=AIza... di file nutriai_backend/.env'
        }), 200

    # 2. Coba panggil Gemini
    model    = os.environ.get('GEMINI_MODEL',   'gemini-2.5-flash-preview-04-17')
    api_ver  = os.environ.get('GEMINI_API_VER', 'v1alpha')
    endpoint = f'https://generativelanguage.googleapis.com/{api_ver}/models/{model}:generateContent?key={key}'
    payload  = json.dumps({
        'contents': [{'parts': [{'text': 'Halo, jawab dengan satu kata: OK'}]}]
    }).encode()
    req = urlreq.Request(endpoint, data=payload, headers={'Content-Type': 'application/json'})

    try:
        with urlreq.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            text = result['candidates'][0]['content']['parts'][0]['text']
            return jsonify({
                'status': 'OK',
                'model': model,
                'key_prefix': key[:8] + '...',
                'gemini_reply': text,
            }), 200
    except urlerr.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        return jsonify({
            'status': 'ERROR',
            'http_code': e.code,
            'error_detail': body[:500],
            'key_prefix': key[:8] + '...',
        }), 200
    except urlerr.URLError as e:
        return jsonify({
            'status': 'ERROR',
            'masalah': 'Tidak bisa konek ke Gemini API',
            'detail': str(e.reason),
            'kemungkinan': 'Server tidak ada akses internet atau firewall block',
        }), 200
    except Exception as e:
        return jsonify({'status': 'ERROR', 'detail': str(e)}), 200




@app.route('/api/ai/debug', methods=['GET'])
def ai_debug():
    """Debug: ListModels dulu, lalu coba semua yg tersedia."""
    import urllib.request as urlreq
    import urllib.error   as urlerr

    key = GEMINI_API_KEY
    if not key:
        return jsonify({'status': 'ERROR', 'masalah': 'GEMINI_API_KEY kosong di .env'}), 200

    # STEP 1: Ambil daftar model yang tersedia untuk key ini
    available_models = []
    try:
        list_url = f'https://generativelanguage.googleapis.com/v1beta/models?key={key}'
        req_list = urlreq.Request(list_url)
        with urlreq.urlopen(req_list, timeout=10) as r:
            models_data = json.loads(r.read())
            for m in models_data.get('models', []):
                if 'generateContent' in m.get('supportedGenerationMethods', []):
                    # name format: "models/gemini-xxx" → strip "models/"
                    available_models.append(m['name'].replace('models/', ''))
    except Exception as le:
        return jsonify({'status': 'ERROR', 'error': f'ListModels gagal: {str(le)}'}), 200

    if not available_models:
        return jsonify({'status': 'ERROR', 'error': 'Tidak ada model tersedia untuk key ini'}), 200

    # STEP 2: Coba satu per satu sampai berhasil
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
                        'status':   '✅ BERHASIL',
                        'model':    model,
                        'api_ver':  api_ver,
                        'response': text[:80],
                        'TINDAKAN': f'Tambahkan 2 baris ini ke .env backend lalu restart Flask:',
                        'ENV_LINE_1': f'GEMINI_MODEL={model}',
                        'ENV_LINE_2': f'GEMINI_API_VER={api_ver}',
                    }), 200
            except urlerr.HTTPError as e:
                body = e.read().decode('utf-8', errors='replace')[:80]
                results.append({'model': model, 'api_ver': api_ver, 'code': e.code, 'err': body})
                if e.code == 429:
                    break  # quota habis untuk model ini, skip api_ver lain
            except Exception as e:
                results.append({'model': model, 'err': str(e)[:60]})

    return jsonify({
        'status':           '❌ SEMUA GAGAL',
        'model_yg_dicoba':  results,
        'semua_model_list': available_models,
    }), 200

@app.route('/api/ai/meal-suggestion', methods=['GET'])
@jwt_required()
def ai_meal_suggestion():
    """Saran menu berdasarkan sisa kalori & protein hari ini."""
    user  = get_current_user()
    today = now_utc().date()

    entries = WaktuMakan.query.join(Food).filter(
        WaktuMakan.user_id   == user.id,
        WaktuMakan.tanggal   == today,
        WaktuMakan.deleted_at.is_(None),
        Food.input_from      == 'input makanan',
    ).all()

    total_protein = sum(e.food.protein for e in entries)
    total_kalori  = sum(e.food.kalori  for e in entries)
    target_cal, target_prot = get_targets(user)
    sisa_kal  = max(target_cal  - total_kalori,  0)
    sisa_prot = max(target_prot - total_protein, 0)

    prompt = (
        f"Kamu adalah asisten nutrisi. User memiliki tujuan diet {user.tujuan}, "
        f"berat {user.bb}kg, tinggi {user.tb}cm, aktivitas {user.aktivitas}. "
        f"Hari ini sudah makan {total_kalori} kcal ({total_protein}g protein). "
        f"Sisa target: {sisa_kal} kcal dan {sisa_prot}g protein. "
        f"Berikan 3 saran menu makanan Indonesia yang mudah didapat untuk memenuhi sisa target. "
        f"Format singkat dan praktis dalam Bahasa Indonesia."
    )

    try:
        result = call_gemini(prompt)
        return jsonify({
            'suggestion': result['text'],
            'tts_text':   result['tts_text'],
            'context': {
                'sisa_kalori':  sisa_kal,
                'sisa_protein': sisa_prot,
            },
        }), 200
    except Exception as e:
        return jsonify({'error': f'AI error: {str(e)}'}), 503


@app.route('/api/ai/analyze-image', methods=['POST'])
@jwt_required()
def ai_analyze_image():
    """Analisis foto makanan → estimasi kalori & protein."""
    import base64

    image_b64 = None
    if 'image' in request.files:
        file      = request.files['image']
        image_b64 = base64.b64encode(file.read()).decode('utf-8')
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
        raw_text = result['text'].strip()
        # Bersihkan jika ada markdown code block
        raw_text = re.sub(r'```json|```', '', raw_text).strip()
        nutrisi  = json.loads(raw_text)
        return jsonify({
            'result':   nutrisi,
            'tts_text': f"Makanan terdeteksi: {nutrisi.get('nama_makanan','tidak diketahui')}. "
                        f"Estimasi kalori {nutrisi.get('estimasi_kalori', 0)} kilokalori, "
                        f"protein {nutrisi.get('estimasi_protein', 0)} gram.",
        }), 200
    except json.JSONDecodeError:
        # Jika AI tidak return JSON valid, kembalikan teks biasa
        return jsonify({'result': None, 'raw': result['text'], 'tts_text': result['tts_text']}), 200
    except Exception as e:
        return jsonify({'error': f'AI error: {str(e)}'}), 503


@app.route('/api/ai/chat', methods=['POST'])
@jwt_required()
def ai_chat():
    """
    Tanya jawab nutrisi personal.
    Payload: { "message": "...", "history": [{"role": "user/model", "text": "..."}] }
    """
    user = get_current_user()
    data = request.get_json() or {}
    msg  = (data.get('message') or '').strip()

    if not msg:
        return jsonify({'error': 'Pesan tidak boleh kosong'}), 400

    target_cal, target_prot = get_targets(user)
    system_context = (
        f"Kamu adalah NutriAI, asisten nutrisi personal yang ramah dan berbicara Bahasa Indonesia. "
        f"Data user: nama={user.username}, bb={user.bb}kg, tb={user.tb}cm, "
        f"umur={user.umur}th, gender={user.gender}, tujuan={user.tujuan}, "
        f"BMR={int(user.bmr or 0)} kcal, TDEE={int(user.tdee or 0)} kcal, "
        f"target harian: {target_cal} kcal & {target_prot}g protein. "
        f"Jawab singkat, spesifik, dan kontekstual. Jika ditanya di luar nutrisi/kesehatan, "
        f"arahkan kembali ke topik nutrisi."
    )

    history = data.get('history', [])
    history_text = '\n'.join(
        f"{'User' if h['role'] == 'user' else 'NutriAI'}: {h['text']}"
        for h in history[-6:]  # Maksimal 6 history terakhir
    )
    full_prompt = f"{system_context}\n\n{history_text}\nUser: {msg}\nNutriAI:"

    try:
        result = call_gemini(full_prompt)
        return jsonify({
            'reply':    result['text'],
            'tts_text': result['tts_text'],
        }), 200
    except Exception as e:
        return jsonify({'error': f'AI error: {str(e)}'}), 503


@app.route('/api/ai/weekly-analysis', methods=['GET'])
@jwt_required()
def ai_weekly_analysis():
    """Analisis otomatis laporan 7 hari terakhir oleh AI."""
    user  = get_current_user()
    week_ago = now_utc() - timedelta(days=7)

    laporan = Laporan.query.filter(
        Laporan.user_id  == user.id,
        Laporan.tanggal  >= week_ago,
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
        f"Detail per hari: {', '.join(f'{l.tanggal.strftime(chr(37)+'d/'+chr(37)+'m')}: {l.total_kalori}kcal/{l.total_protein}gP' for l in laporan)}.\n"
        f"Buat ringkasan 3-4 kalimat: pencapaian, kekurangan, dan 1 saran konkret untuk minggu depan."
    )

    try:
        result = call_gemini(prompt)
        return jsonify({
            'analysis': result['text'],
            'tts_text': result['tts_text'],
            'stats': {
                'avg_kalori':  avg_kal,
                'avg_protein': avg_prot,
                'hari_input':  len(laporan),
                'target_kalori':  target_cal,
                'target_protein': target_prot,
            },
        }), 200
    except Exception as e:
        return jsonify({'error': f'AI error: {str(e)}'}), 503



@app.route('/api/ai/voice-command', methods=['POST'])
@jwt_required()
def ai_voice_command():
    import urllib.request as urlreq
    import urllib.error   as urlerr
    from collections import defaultdict

    user = get_current_user()
    data = request.get_json() or {}

    text_input = (data.get('text')         or '').strip()
    audio_b64  = (data.get('audio_base64') or '').strip()
    mime_type  = (data.get('mime_type')    or 'audio/mp4').strip()

    if not text_input and not audio_b64:
        return jsonify({'error': 'Kirim text atau audio_base64'}), 400

    if audio_b64 and len(audio_b64) > 10_000_000:
        return jsonify({'error': 'Audio terlalu panjang, coba bicara lebih singkat'}), 400

    # ── Konteks user ─────────────────────────────────────────────────────────
    target_cal, target_prot = get_targets(user)
    today  = now_utc().date()
    jam_wib = (now_utc().hour + 7) % 24
    if   5  <= jam_wib < 10: waktu_default = 'Pagi'
    elif 10 <= jam_wib < 15: waktu_default = 'Siang'
    elif 15 <= jam_wib < 18: waktu_default = 'Sore'
    else:                    waktu_default = 'Malam'

    # Makanan hari ini (hanya input_from='input makanan' untuk total yang akurat)
    today_entries = db.session.query(WaktuMakan).join(Food).filter(
        WaktuMakan.user_id    == user.id,
        WaktuMakan.tanggal    == today,
        WaktuMakan.deleted_at.is_(None),
        Food.input_from       == 'input makanan',
    ).all()
    total_kal_hari  = sum(e.food.kalori  or 0 for e in today_entries)
    total_prot_hari = sum(e.food.protein or 0 for e in today_entries)

    # Database makanan master
    food_db   = Food.query.filter(
        Food.input_from == 'tambah data',
        Food.deleted_at.is_(None),
    ).order_by(Food.nama_makanan).all()
    food_list = '\n'.join(
        f"- id:{f.id} | {f.nama_makanan} | {f.kalori}kcal | {f.protein}g protein"
        f" | karbo:{f.karbo or 0}g | lemak:{f.lemak or 0}g | {f.gram_per_porsi or 100}g/porsi"
        for f in food_db
    ) or '(belum ada makanan di database)'

    makanan_hari = ', '.join(
        f"{e.food.nama_makanan}({e.food.porsi or 1}porsi, {e.waktu_makan})"
        for e in today_entries
    ) or 'belum ada'

    # Air hari ini
    total_air = db.session.query(db.func.sum(WaterLog.ml)).filter(
        WaterLog.user_id == user.id,
        WaterLog.tanggal == today,
        WaterLog.deleted_at.is_(None),
    ).scalar() or 0
    target_air = int(user.bb * 33)

    # Streak
    streak = calc_streak(user.id)

    # Meal templates user
    templates = MealTemplate.query.filter_by(user_id=user.id)\
        .filter(MealTemplate.deleted_at.is_(None)).all()
    template_list = ', '.join(f"id:{t.id}|{t.nama}" for t in templates) or 'belum ada'

    system_prompt = f"""Kamu adalah NutriAI Jarvis, asisten nutrisi voice pribadi yang cerdas dan responsif.
SELALU balas dalam Bahasa Indonesia yang natural dan ramah.

━━━ KONTEKS USER ━━━
Nama: {user.username} | BB: {user.bb}kg | TB: {user.tb}cm | Umur: {user.umur}th | Gender: {user.gender}
Tujuan: {user.tujuan} | Aktivitas: {user.aktivitas} | Tipe tubuh: {user.tipe_tubuh}
BMR: {int(user.bmr or 0)} kcal | TDEE: {int(user.tdee or 0)} kcal
Target harian: {target_cal} kcal / {target_prot}g protein
Waktu: {now_utc().strftime('%H:%M')} WIB | Tanggal: {today} | Waktu makan sekarang: {waktu_default}

━━━ STATUS HARI INI ━━━
Makanan: {makanan_hari}
Total: {total_kal_hari} kcal / {total_prot_hari}g protein
Sisa target: {max(0, target_cal-total_kal_hari)} kcal / {max(0, target_prot-total_prot_hari)}g protein
Air: {total_air}ml dari target {target_air}ml ({max(0, target_air-total_air)}ml lagi)
Streak: {streak['current']} hari berturut-turut (terpanjang: {streak['longest']} hari)

━━━ DATABASE MAKANAN (untuk input harian) ━━━
{food_list}

━━━ MEAL TEMPLATES USER ━━━
{template_list}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PENTING: BEDAKAN KONTEKS PERINTAH USER

▶ INPUT MAKANAN HARIAN → intent: add_food
  Ciri: user menyebut sudah makan / baru makan / catat makan
  Contoh: "tadi makan nasi goreng", "catat saya makan ayam 2 potong", "input sarapan"
  → Cocokkan ke DATABASE MAKANAN di atas, jika tidak ada → not_found

▶ TAMBAH DATA MAKANAN BARU → intent: tambah_data  
  Ciri: user ingin mendaftarkan makanan baru ke database
  Contoh: "tambah data daging sapi 100 gram", "daftarkan rendang ke database", "input data nutrisi tempe"
  → Gunakan pengetahuanmu untuk mencari nilai gizi per jumlah gram yang diminta
  → gram_per_porsi = jumlah gram yang disebutkan user (default 100g)

▶ GUNAKAN TEMPLATE → intent: use_template
  Ciri: user menyebut template / preset / menu favorit
  Contoh: "gunakan template sarapan", "pakai menu makan siang favorit"
  → Cari dari MEAL TEMPLATES USER di atas, isi params.template_id

▶ HAPUS MAKANAN HARI INI → intent: delete_food
  Ciri: user ingin menghapus/membatalkan entry makanan hari ini
  Contoh: "hapus nasi goreng tadi", "batalkan input ayam bakar", "hapus makanan terakhir"
  → Cari dari makanan hari ini di konteks, isi params.waktu_makan_id jika tahu

▶ CEK MAKANAN HARI INI → intent: check_today
▶ CEK NUTRISI/PROGRESS → intent: check_nutrition  
▶ CEK LAPORAN → intent: check_laporan
  Contoh: "laporan minggu ini", "statistik 7 hari", "progress bulan ini"
▶ CATAT AIR MINUM → intent: add_water
  Contoh: "minum 1 gelas", "catat air 500ml", "minum 1 botol"
▶ CEK AIR → intent: check_water
▶ CATAT BERAT BADAN → intent: add_weight
  Contoh: "berat badan saya 70kg", "timbang 68.5 kilo"
▶ CEK BERAT BADAN → intent: check_weight
▶ SARAN MAKANAN → intent: meal_suggestion
  Ciri: user minta rekomendasi menu / apa yang harus dimakan
  Contoh: "saya harus makan apa?", "rekomendasikan menu makan malam", "saran makanan protein tinggi"
▶ ANALISIS NUTRISI → intent: analyze_nutrition
  Ciri: user tanya tentang nutrisi makanan tertentu, tips diet, info kalori
  Contoh: "berapa kalori nasi putih?", "makanan apa yang tinggi protein?", "tips bulking"
▶ PERTANYAAN UMUM NUTRISI → intent: general
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BALAS HANYA dalam format JSON ini, TIDAK BOLEH ada teks di luar JSON:
{{
  "intent": "add_food|tambah_data|use_template|delete_food|check_today|check_nutrition|check_laporan|add_water|check_water|add_weight|check_weight|meal_suggestion|analyze_nutrition|general|unclear",
  "reply": "Balasan natural ramah Bahasa Indonesia, max 2 kalimat",
  "tts_text": "Versi reply tanpa emoji/markdown/simbol untuk TTS",
  "confidence": "high|low",
  "unclear_reason": "alasan jika tidak jelas (opsional)",
  "answer": "Untuk general/meal_suggestion/analyze_nutrition: jawaban lengkap di sini. Lainnya kosong.",
  "params": {{
    "items": [{{"food_id": <id>, "nama_makanan": "...", "porsi": <integer≥1>, "waktu_makan": "Pagi/Siang/Sore/Malam"}}],
    "not_found": ["nama makanan tidak ada di database"],
    "new_food": {{
      "nama_makanan": "...",
      "kalori": <integer>,
      "protein": <integer>,
      "karbo": <integer>,
      "lemak": <integer>,
      "serat": <integer>,
      "gram_per_porsi": <integer, default 100>
    }},
    "template_id": <integer, untuk use_template>,
    "waktu_makan_override": "Pagi/Siang/Sore/Malam",
    "waktu_makan_id": <integer id WaktuMakan yang mau dihapus, untuk delete_food>,
    "nama_makanan_hapus": "nama makanan yang mau dihapus (jika waktu_makan_id tidak diketahui)",
    "jumlah_ml": <integer, untuk add_water>,
    "berat": <float, untuk add_weight>,
    "periode": "7_hari|30_hari|minggu_ini|bulan_ini",
    "catatan": "opsional"
  }}
}}

ATURAN PENTING:
- add_food: WAJIB cocokkan ke DATABASE MAKANAN. Jika tidak ada → not_found. Jangan pernah tambah makanan yang tidak ada di DB ke items.
- tambah_data: Gunakan pengetahuan nutrisi untuk isi new_food. Semua nilai integer. Jika tidak tahu → 0.
- "centong"/"piring"=1 porsi nasi | "potong"/"iris"=1 porsi lauk | "gelas"=250ml | "botol"=600ml | "mangkok"=1 porsi | "sendok makan"=15g
- Jika user sebut waktu (pagi/siang/sore/malam/sarapan/makan siang/makan malam) → isi waktu_makan sesuai
- Jika audio tidak jelas / noise / tidak ada suara → intent "unclear"
- confidence "low" jika ada bagian ambigu tapi masih bisa diproses
- SELALU JSON valid, tidak ada karakter di luar JSON, tidak ada trailing comma"""

    # ── Panggil Gemini ────────────────────────────────────────────────────────
    try:
        parts = []
        if audio_b64:
            parts.append({'inline_data': {'mime_type': mime_type, 'data': audio_b64}})
            parts.append({'text': 'Pahami perintah voice di atas dan balas sesuai instruksi system.'})
        else:
            parts.append({'text': f'Perintah user: "{text_input}"'})

        key      = GEMINI_API_KEY
        model    = os.environ.get('GEMINI_MODEL',   'gemini-2.5-flash')
        api_ver  = os.environ.get('GEMINI_API_VER', 'v1beta')
        endpoint = f'https://generativelanguage.googleapis.com/{api_ver}/models/{model}:generateContent?key={key}'

        app.logger.info(f'[VoiceCmd] model={model} audio={bool(audio_b64)} len={len(audio_b64)}')

        payload = json.dumps({
            'system_instruction': {'parts': [{'text': system_prompt}]},
            'contents':           [{'parts': parts}],
            'generationConfig':   {'temperature': 0.15, 'maxOutputTokens': 1200},
        }).encode()

        gemini_result = None
        last_error    = None
        for attempt in range(3):
            try:
                req = urlreq.Request(endpoint, data=payload, headers={'Content-Type': 'application/json'})
                with urlreq.urlopen(req, timeout=55) as resp:
                    gemini_result = json.loads(resp.read())
                break
            except urlerr.HTTPError as http_err:
                err_body = http_err.read().decode('utf-8', errors='replace')
                app.logger.error(f'[VoiceCmd] HTTPError {http_err.code} (attempt {attempt+1}/3): {err_body[:300]}')
                last_error = f'HTTP error {http_err.code}: {err_body[:200]}'
                if http_err.code in (503, 429, 500) and attempt < 2:
                    time.sleep([3, 7, 15][attempt]); continue
                raise RuntimeError(last_error)
            except urlerr.URLError as url_err:
                app.logger.error(f'[VoiceCmd] URLError (attempt {attempt+1}/3): {url_err.reason}')
                last_error = str(url_err.reason)
                if attempt < 2:
                    time.sleep([3, 7, 15][attempt]); continue
                raise RuntimeError(f'Koneksi gagal: {last_error}')

        if gemini_result is None:
            raise RuntimeError(last_error or 'Semua retry gagal')

        raw = gemini_result['candidates'][0]['content']['parts'][0]['text'].strip()
        raw = re.sub(r'^```[a-zA-Z]*\s*', '', raw)
        raw = re.sub(r'\s*```$',           '', raw)
        raw = raw.strip()
        app.logger.info(f'[VoiceCmd] Gemini OK: {raw[:100]}')
        ai_data = json.loads(raw)

    except RuntimeError as e:
        return jsonify({'error': f'AI tidak tersedia: {str(e)}'}), 503
    except json.JSONDecodeError as e:
        app.logger.error(f'[VoiceCmd] JSON error: {e} | raw: {raw[:300]}')
        return jsonify({'error': 'AI response tidak valid, coba ulangi'}), 500
    except Exception as e:
        app.logger.error(f'[VoiceCmd] Unexpected: {e}', exc_info=True)
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

        # ── add_food ──────────────────────────────────────────────────────────
        if intent == 'add_food':
            items     = params.get('items', [])
            not_found = list(params.get('not_found', []))
            added     = []
            for item in items:
                food_id     = item.get('food_id')
                food_master = db.session.get(Food, food_id) if food_id else None
                # Fallback: cari by nama jika food_id tidak valid
                if not food_master or food_master.input_from != 'tambah data':
                    name = (item.get('nama_makanan') or '').strip().lower()
                    if name:
                        food_master = Food.query.filter(
                            Food.input_from == 'tambah data',
                            Food.deleted_at.is_(None),
                            Food.nama_makanan.ilike(f'%{name}%'),
                        ).first()
                if food_master:
                    porsi         = max(1, int(item.get('porsi') or 1))
                    wkt           = item.get('waktu_makan') or waktu_default
                    if wkt not in ('Pagi', 'Siang', 'Sore', 'Malam'):
                        wkt = waktu_default
                    food_log = Food(
                        nama_makanan = food_master.nama_makanan,
                        porsi        = porsi,
                        protein      = (food_master.protein or 0) * porsi,
                        kalori       = (food_master.kalori  or 0) * porsi,
                        karbo        = (food_master.karbo   or 0) * porsi,
                        lemak        = (food_master.lemak   or 0) * porsi,
                        user_id      = user.id,
                        input_from   = 'input makanan',
                        image        = food_master.image or '',
                    )
                    db.session.add(food_log)
                    db.session.flush()
                    db.session.add(WaktuMakan(
                        waktu_makan = wkt,
                        food_id     = food_log.id,
                        user_id     = user.id,
                        tanggal     = today,
                        porsi       = porsi,
                    ))
                    added.append({
                        'nama': food_master.nama_makanan, 'porsi': porsi,
                        'waktu': wkt,
                        'kalori': food_log.kalori, 'protein': food_log.protein,
                    })
                else:
                    nama = item.get('nama_makanan', '')
                    if nama and nama not in not_found:
                        not_found.append(nama)
            if added:
                db.session.commit()
                record_streak(user.id, today)
            action_result.update({'added': added, 'not_found': not_found, 'count': len(added)})

        # ── tambah_data ───────────────────────────────────────────────────────
        elif intent == 'tambah_data':
            nf   = params.get('new_food') or {}
            nama = (nf.get('nama_makanan') or '').strip()
            if not nama:
                action_result.update({'status': 'error', 'error': 'Nama makanan tidak ditemukan dari perintah'})
            else:
                existing = Food.query.filter(
                    Food.nama_makanan.ilike(nama),
                    Food.input_from == 'tambah data',
                    Food.deleted_at.is_(None),
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
                        food_baru = Food(
                            nama_makanan   = nama,
                            kalori         = kalori,
                            protein        = int(nf.get('protein') or 0),
                            karbo          = int(nf.get('karbo')   or 0),
                            lemak          = int(nf.get('lemak')   or 0),
                            serat          = int(nf.get('serat')   or 0),
                            gram_per_porsi = int(nf.get('gram_per_porsi') or 100),
                            user_id        = user.id,
                            input_from     = 'tambah data',
                            is_verified    = False,
                        )
                        db.session.add(food_baru)
                        db.session.commit()
                        action_result.update({
                            'status': 'added', 'id': food_baru.id,
                            'nama': food_baru.nama_makanan,
                            'kalori': food_baru.kalori, 'protein': food_baru.protein,
                            'karbo': food_baru.karbo,   'lemak': food_baru.lemak,
                            'gram_per_porsi': food_baru.gram_per_porsi,
                        })

        # ── use_template ──────────────────────────────────────────────────────
        elif intent == 'use_template':
            tid      = params.get('template_id')
            template = MealTemplate.query.filter_by(id=tid, user_id=user.id)\
                .filter(MealTemplate.deleted_at.is_(None)).first() if tid else None
            if not template:
                # Coba cari by nama dari reply AI
                nama_tmpl = (params.get('catatan') or '').lower()
                if nama_tmpl:
                    template = MealTemplate.query.filter(
                        MealTemplate.user_id == user.id,
                        MealTemplate.deleted_at.is_(None),
                        MealTemplate.nama.ilike(f'%{nama_tmpl}%'),
                    ).first()
            if not template:
                action_result.update({'status': 'not_found', 'error': 'Template tidak ditemukan'})
            else:
                wkt   = params.get('waktu_makan_override') or waktu_default
                added = 0
                for titem in template.items:
                    if titem.deleted_at or not titem.food: continue
                    src      = titem.food
                    porsi    = titem.porsi or 1
                    food_log = Food(
                        nama_makanan = src.nama_makanan, porsi = porsi,
                        protein = (src.protein or 0) * porsi,
                        kalori  = (src.kalori  or 0) * porsi,
                        karbo   = (src.karbo   or 0) * porsi,
                        lemak   = (src.lemak   or 0) * porsi,
                        user_id = user.id, input_from = 'input makanan',
                        image   = src.image or '',
                    )
                    db.session.add(food_log)
                    db.session.flush()
                    db.session.add(WaktuMakan(
                        waktu_makan=wkt, food_id=food_log.id,
                        user_id=user.id, tanggal=today, porsi=porsi,
                    ))
                    added += 1
                db.session.commit()
                record_streak(user.id, today)
                action_result.update({
                    'status': 'ok', 'template_nama': template.nama,
                    'added': added, 'waktu': wkt,
                })

        # ── delete_food ───────────────────────────────────────────────────────
        elif intent == 'delete_food':
            wm_id = params.get('waktu_makan_id')
            entry = None
            if wm_id:
                entry = WaktuMakan.query.filter_by(id=wm_id, user_id=user.id)\
                    .filter(WaktuMakan.deleted_at.is_(None)).first()
            # Fallback: hapus entry terakhir dengan nama tersebut hari ini
            if not entry:
                nama_hapus = (params.get('nama_makanan_hapus') or '').strip().lower()
                if nama_hapus:
                    entry = db.session.query(WaktuMakan).join(Food).filter(
                        WaktuMakan.user_id    == user.id,
                        WaktuMakan.tanggal    == today,
                        WaktuMakan.deleted_at.is_(None),
                        Food.input_from       == 'input makanan',
                        Food.nama_makanan.ilike(f'%{nama_hapus}%'),
                    ).order_by(WaktuMakan.id.desc()).first()
            if entry:
                nama_deleted = entry.food.nama_makanan if entry.food else '?'
                entry.deleted_at = now_utc()
                if entry.food and entry.food.input_from == 'input makanan':
                    db.session.delete(entry.food)
                db.session.commit()
                action_result.update({'status': 'deleted', 'nama': nama_deleted})
            else:
                action_result.update({'status': 'not_found', 'error': 'Makanan tidak ditemukan di log hari ini'})

        # ── add_water ─────────────────────────────────────────────────────────
        elif intent == 'add_water':
            ml = int(params.get('jumlah_ml') or 250)
            ml = max(50, min(ml, 2000))  # clamp 50–2000ml
            db.session.add(WaterLog(user_id=user.id, ml=ml, tanggal=today))
            db.session.commit()
            total_ml_baru = db.session.query(db.func.sum(WaterLog.ml)).filter(
                WaterLog.user_id == user.id,
                WaterLog.tanggal == today,
                WaterLog.deleted_at.is_(None),
            ).scalar() or 0
            action_result.update({
                'added_ml': ml, 'total_ml': total_ml_baru,
                'target_ml': target_air,
                'sisa_ml': max(0, target_air - total_ml_baru),
            })

        # ── check_water ───────────────────────────────────────────────────────
        elif intent == 'check_water':
            action_result.update({
                'total_ml': total_air, 'target_ml': target_air,
                'sisa_ml': max(0, target_air - total_air),
                'progress': min(round(total_air / target_air * 100, 1), 100) if target_air else 0,
            })

        # ── add_weight ────────────────────────────────────────────────────────
        elif intent == 'add_weight':
            berat = float(params.get('berat') or 0)
            if not (30 <= berat <= 300):
                action_result.update({'status': 'error', 'error': f'Berat {berat}kg tidak valid (30–300kg)'})
            else:
                catatan  = (params.get('catatan') or '').strip()
                existing = WeightHistory.query.filter_by(user_id=user.id, tanggal=today)\
                    .filter(WeightHistory.deleted_at.is_(None)).first()
                if existing:
                    existing.bb = berat; existing.catatan = catatan
                else:
                    db.session.add(WeightHistory(user_id=user.id, bb=berat, tanggal=today, catatan=catatan))
                # Update bb user juga
                user.bb = int(round(berat))
                user.bmr, user.tdee = hitung_bmr_tdee(
                    user.bb, user.tb, user.umur, user.gender, user.aktivitas, user.tipe_tubuh
                )
                db.session.commit()
                action_result.update({'berat': berat, 'status': 'saved'})

        # ── check_weight ──────────────────────────────────────────────────────
        elif intent == 'check_weight':
            latest = WeightHistory.query.filter_by(user_id=user.id)\
                .filter(WeightHistory.deleted_at.is_(None))\
                .order_by(WeightHistory.tanggal.desc()).first()
            prev   = WeightHistory.query.filter_by(user_id=user.id)\
                .filter(WeightHistory.deleted_at.is_(None))\
                .order_by(WeightHistory.tanggal.desc()).offset(1).first()
            if latest:
                action_result.update({
                    'berat': latest.bb, 'tanggal': str(latest.tanggal),
                    'perubahan': round(latest.bb - prev.bb, 1) if prev else 0,
                })

        # ── check_today ───────────────────────────────────────────────────────
        elif intent == 'check_today':
            action_result['entries'] = [
                {
                    'id':      e.id,
                    'nama':    e.food.nama_makanan,
                    'waktu':   e.waktu_makan,
                    'porsi':   e.food.porsi or 1,
                    'kalori':  e.food.kalori  or 0,
                    'protein': e.food.protein or 0,
                }
                for e in today_entries
            ]
            action_result.update({
                'total_kalori':  total_kal_hari,
                'total_protein': total_prot_hari,
                'target_kalori': target_cal,
                'target_protein': target_prot,
                'sisa_kalori':   max(0, target_cal  - total_kal_hari),
                'sisa_protein':  max(0, target_prot - total_prot_hari),
            })

        # ── check_nutrition ───────────────────────────────────────────────────
        elif intent == 'check_nutrition':
            action_result.update({
                'total_kalori':   total_kal_hari,
                'total_protein':  total_prot_hari,
                'target_kalori':  target_cal,
                'target_protein': target_prot,
                'sisa_kalori':    max(0, target_cal  - total_kal_hari),
                'sisa_protein':   max(0, target_prot - total_prot_hari),
                'progress_kalori':  min(round(total_kal_hari  / target_cal  * 100, 1), 100) if target_cal  else 0,
                'progress_protein': min(round(total_prot_hari / target_prot * 100, 1), 100) if target_prot else 0,
                'streak': streak,
            })

        # ── check_laporan ─────────────────────────────────────────────────────
        elif intent == 'check_laporan':
            periode = params.get('periode', '7_hari')
            if periode in ('minggu_ini', '7_hari'):
                since = today - timedelta(days=6)
            elif periode in ('bulan_ini', '30_hari'):
                since = today - timedelta(days=29)
            else:
                since = today - timedelta(days=6)

            entries_lap = db.session.query(WaktuMakan).join(Food).filter(
                WaktuMakan.user_id    == user.id,
                WaktuMakan.tanggal    >= since,
                WaktuMakan.tanggal    <= today,
                WaktuMakan.deleted_at.is_(None),
                Food.input_from       == 'input makanan',
            ).all()

            per_hari = defaultdict(lambda: {'kalori': 0, 'protein': 0, 'karbo': 0, 'lemak': 0})
            for e in entries_lap:
                tgl = str(e.tanggal)
                per_hari[tgl]['kalori']  += e.food.kalori  or 0
                per_hari[tgl]['protein'] += e.food.protein or 0
                per_hari[tgl]['karbo']   += e.food.karbo   or 0
                per_hari[tgl]['lemak']   += e.food.lemak   or 0

            hari_list = sorted(per_hari.items())
            n = len(hari_list) or 1
            avg_kalori  = round(sum(v['kalori']  for _, v in hari_list) / n)
            avg_protein = round(sum(v['protein'] for _, v in hari_list) / n)

            action_result.update({
                'periode': periode, 'since': str(since), 'until': str(today),
                'per_hari':    [{'tanggal': t, **v} for t, v in hari_list],
                'avg_kalori':  avg_kalori,
                'avg_protein': avg_protein,
                'total_hari':  len(hari_list),
                'target_kalori':  target_cal,
                'target_protein': target_prot,
            })

        # ── meal_suggestion / analyze_nutrition / general ─────────────────────
        elif intent in ('meal_suggestion', 'analyze_nutrition', 'general'):
            action_result.update({'answer': answer})

    except Exception as e:
        db.session.rollback()
        app.logger.error(f'[VoiceCmd] Action error intent={intent}: {e}', exc_info=True)
        action_result.update({'status': 'error', 'error': str(e)})

    return jsonify({
        'intent':         intent,
        'reply':          reply,
        'tts_text':       tts_text,
        'confidence':     confidence,
        'unclear_reason': unclear_reason,
        'action_result':  action_result,
    }), 200

# ─────────────────────────────────────────────────────────
#  ERROR HANDLERS
# ─────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint tidak ditemukan'}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'error': 'Method tidak diizinkan'}), 405


@app.errorhandler(500)
def server_error(e):
    db.session.rollback()
    return jsonify({'error': 'Terjadi kesalahan server'}), 500


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token expired', 'code': 'TOKEN_EXPIRED'}), 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Token tidak valid', 'code': 'INVALID_TOKEN'}), 401


@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify({'error': 'Token tidak ditemukan', 'code': 'MISSING_TOKEN'}), 401


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)