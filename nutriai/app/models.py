import uuid
import re
from datetime import datetime, timezone, timedelta

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


# ─────────────────────────────────────────────────────────
#  TINY UTILS
# ─────────────────────────────────────────────────────────

WIB = timezone(timedelta(hours=7))


def gen_uuid() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_wib_date():
    """Tanggal hari ini dalam zona waktu WIB (UTC+7)."""
    return datetime.now(WIB).date()


def safe_int(val, default=0) -> int:
    try:
        return int(re.sub(r'\D', '', str(val)) or default)
    except (ValueError, TypeError):
        return default


def safe_float(val, default=0.0) -> float:
    """
    Sama seperti safe_int, tapi untuk angka desimal (protein, kalori,
    karbo, lemak, serat, gram_per_porsi, dll). PENTING: safe_int TIDAK
    boleh dipakai untuk field ini karena membuang karakter titik ('.'),
    sehingga "10.9" malah jadi 109 alih-alih 10.9.
    """
    try:
        s = str(val).strip().replace(',', '.')       # jaga-jaga kalau user ketik pakai koma
        s = re.sub(r'[^0-9.\-]', '', s)                # buang karakter selain digit/titik/minus
        if s in ('', '-', '.', '-.'):
            return default
        return float(s)
    except (ValueError, TypeError):
        return default


# ─────────────────────────────────────────────────────────
#  MODELS
#  Disesuaikan dengan schema Supabase (PostgreSQL) aktual.
#  SQLite hanya dipakai sebagai engine dev lokal (bukan bagian
#  dari fitur offline-sync mobile — fitur itu sudah dihapus).
#  Supabase tetap sumber kebenaran untuk kolom.
# ─────────────────────────────────────────────────────────

class User(db.Model):
    """
    Tabel: users (Supabase public schema)
    Catatan:
      - password disimpan sebagai password_hash di Supabase
      - bb / tb pakai Float (double precision di Supabase)
      - bmi disimpan di DB (kolom bmi ada di Supabase)
      - foto_url di Supabase, bukan profile_picture
      - target_bb & bb_awal: kolom baru, sudah di-ALTER via SQL
    """
    __tablename__ = 'users'

    id              = db.Column(db.Integer,     primary_key=True)
    username        = db.Column(db.String(120), unique=True, nullable=False)
    password_hash   = db.Column(db.String(255), nullable=True)   # nullable karena Supabase Auth bisa handle auth
    umur            = db.Column(db.Integer,     nullable=False)
    tb              = db.Column(db.Float,       nullable=False)   # double precision di Supabase
    bb              = db.Column(db.Float,       nullable=False)   # double precision di Supabase
    foto_url        = db.Column(db.Text,        nullable=True)    # nama kolom aktual di Supabase
    tujuan          = db.Column(db.String(50),  nullable=False)
    aktivitas       = db.Column(db.String(50),  nullable=False)
    tipe_tubuh      = db.Column(db.String(50),  nullable=False)
    gender          = db.Column(db.String(10),  nullable=False)
    bmr             = db.Column(db.Float,       nullable=True)
    tdee            = db.Column(db.Float,       nullable=True)
    bmi             = db.Column(db.Float,       nullable=True)    # disimpan di DB, bukan dihitung saja
    target_bb       = db.Column(db.Float,       nullable=True)    # berat badan target (kg)
    bb_awal         = db.Column(db.Float,       nullable=True)    # berat badan saat mulai program
    sync_id         = db.Column(db.String(36),  unique=True, default=gen_uuid)
    created_at      = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at      = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    deleted_at      = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self):
        # Hitung BMI on-the-fly sebagai fallback kalau kolom bmi kosong
        bmi_val = self.bmi or (
            round(self.bb / ((self.tb / 100) ** 2), 1) if self.tb and self.bb else 0
        )
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
            'bmi':             bmi_val,
            'target_bb':       self.target_bb,
            'bb_awal':         self.bb_awal,
            'foto_url':        self.foto_url or '',
            'sync_id':         self.sync_id or '',
        }


class Food(db.Model):
    """
    Tabel: food
    Hanya menyimpan data nutrisi makanan (food database komunal).
    Log harian ada di tabel waktu_makan (denormalized — sudah punya
    kolom nutrisi sendiri, tidak perlu JOIN ke food untuk kalori).

    Kolom input_from TIDAK ADA di Supabase — dihapus dari model.

    user_id: NULL = makanan default/global (bisa dilihat & dipakai semua
    user). Diisi (angka) = makanan pribadi, cuma pemiliknya sendiri yang
    bisa lihat & pakai. Ditambahkan supaya user bisa daftarkan makanan
    baru tanpa "mengotori" database bersama untuk semua orang.
    """
    __tablename__ = 'food'

    id             = db.Column(db.Integer,     primary_key=True)
    user_id        = db.Column(db.Integer,     db.ForeignKey('users.id'), nullable=True)
    nama_makanan   = db.Column(db.String(120), nullable=False)
    protein        = db.Column(db.Float,       nullable=False)   # double precision di Supabase
    kalori         = db.Column(db.Float,       nullable=False)
    karbo          = db.Column(db.Float,       nullable=True,  default=0)
    lemak          = db.Column(db.Float,       nullable=True,  default=0)
    serat          = db.Column(db.Float,       nullable=True,  default=0)
    gram_per_porsi = db.Column(db.Float,       nullable=True,  default=100)
    image          = db.Column(db.Text,        nullable=True)
    is_verified    = db.Column(db.Boolean,     default=False)
    sync_id        = db.Column(db.String(36),  default=gen_uuid)
    created_at     = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at     = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    deleted_at     = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            'id':             self.id,
            'user_id':        self.user_id,   # None = makanan global/default
            'nama_makanan':   self.nama_makanan,
            'protein':        self.protein or 0,
            'kalori':         self.kalori or 0,
            'karbo':          self.karbo or 0,
            'lemak':          self.lemak or 0,
            'serat':          self.serat or 0,
            'gram_per_porsi': self.gram_per_porsi or 100,
            'image':          self.image or '',
            'is_verified':    self.is_verified or False,
            'sync_id':        self.sync_id or '',
        }


class WaktuMakan(db.Model):
    """
    Tabel: waktu_makan
    Log harian makanan per user — denormalized.
    Kolom nutrisi (protein, kalori, karbo, lemak) sudah disimpan langsung
    di sini (tidak perlu JOIN food) — sesuai schema Supabase aktual.
    food_id tetap ada sebagai referensi ke food database, tapi nullable
    karena makanan custom tidak harus ada di tabel food.
    """
    __tablename__ = 'waktu_makan'

    id           = db.Column(db.Integer,    primary_key=True)
    user_id      = db.Column(db.Integer,    db.ForeignKey('users.id'), nullable=False)
    food_id      = db.Column(db.Integer,    db.ForeignKey('food.id'),  nullable=True)
    nama_makanan = db.Column(db.String(120),nullable=False)
    protein      = db.Column(db.Float,      nullable=True, default=0)
    kalori       = db.Column(db.Float,      nullable=True, default=0)
    karbo        = db.Column(db.Float,      nullable=True, default=0)
    lemak        = db.Column(db.Float,      nullable=True, default=0)
    porsi        = db.Column(db.Integer,    nullable=True, default=1)
    waktu_makan  = db.Column(db.String(50), nullable=False)
    catatan      = db.Column(db.Text,       nullable=True)
    tanggal      = db.Column(db.Date,       default=now_wib_date)
    image        = db.Column(db.Text,       nullable=True)
    sync_id      = db.Column(db.String(36), default=gen_uuid)
    created_at   = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at   = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    deleted_at   = db.Column(db.DateTime(timezone=True), nullable=True)

    food = db.relationship('Food', backref='waktu_makan_entries', lazy=True)
    user = db.relationship('User', backref='waktu_makan_entries', lazy=True)

    def to_dict(self):
        return {
            'id':           self.id,
            'nama_makanan': self.nama_makanan,
            'protein':      self.protein or 0,
            'kalori':       self.kalori or 0,
            'karbo':        self.karbo or 0,
            'lemak':        self.lemak or 0,
            'porsi':        self.porsi or 1,
            'waktu_makan':  self.waktu_makan,
            'catatan':      self.catatan or '',
            'tanggal':      str(self.tanggal),
            'image':        self.image or '',
            'sync_id':      self.sync_id or '',
            'food':         self.food.to_dict() if self.food else {},
        }


class Laporan(db.Model):
    """
    Tabel: laporan
    Catatan: TIDAK ada kolom food_id atau waktu_makan di Supabase —
    ini tabel ringkasan/snapshot, bukan per-item-makanan.
    """
    __tablename__ = 'laporan'

    id            = db.Column(db.Integer,    primary_key=True)
    user_id       = db.Column(db.Integer,    db.ForeignKey('users.id'), nullable=False)
    tanggal       = db.Column(db.DateTime(timezone=True), default=now_utc)
    total_protein = db.Column(db.Float,      nullable=False, default=0)
    total_kalori  = db.Column(db.Float,      nullable=False, default=0)
    total_karbo   = db.Column(db.Float,      nullable=True,  default=0)
    total_lemak   = db.Column(db.Float,      nullable=True,  default=0)
    sync_id       = db.Column(db.String(36), default=gen_uuid)
    created_at    = db.Column(db.DateTime(timezone=True), default=now_utc)

    user = db.relationship('User', backref='laporan', lazy=True)

    def to_dict(self):
        return {
            'id':            self.id,
            'tanggal':       self.tanggal.strftime('%Y-%m-%dT%H:%M:%S') if self.tanggal else '',
            'total_protein': self.total_protein or 0,
            'total_kalori':  self.total_kalori or 0,
            'total_karbo':   self.total_karbo or 0,
            'total_lemak':   self.total_lemak or 0,
            'sync_id':       self.sync_id or '',
        }


class WeightHistory(db.Model):
    """
    Tabel: weight_history
    Kolom berat di Supabase bernama 'berat' (bukan 'bb').
    """
    __tablename__ = 'weight_history'

    id         = db.Column(db.Integer,    primary_key=True)
    user_id    = db.Column(db.Integer,    db.ForeignKey('users.id'), nullable=False)
    berat      = db.Column(db.Float,      nullable=False)          # nama kolom aktual di Supabase
    tanggal    = db.Column(db.Date,       default=now_wib_date)
    catatan    = db.Column(db.Text,       nullable=True)
    sync_id    = db.Column(db.String(36), default=gen_uuid, unique=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship('User', backref='weight_history', lazy=True)

    def to_dict(self):
        return {
            'id':      self.id,
            'berat':   self.berat,       # konsisten dengan nama kolom
            'bb':      self.berat,       # alias untuk kompatibilitas frontend lama
            'tanggal': str(self.tanggal),
            'catatan': self.catatan or '',
            'sync_id': self.sync_id or '',
        }


class WaterLog(db.Model):
    """Tabel: water_log — kolom 'jumlah_ml' (bukan 'ml'). Tidak ada waktu_input/sync_id/deleted_at."""
    __tablename__ = 'water_log'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    jumlah_ml  = db.Column(db.Integer, nullable=False)
    tanggal    = db.Column(db.Date,    default=now_wib_date)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)

    user = db.relationship('User', backref='water_logs', lazy=True)

    def to_dict(self):
        return {
            'id':        self.id,
            'jumlah_ml': self.jumlah_ml,
            'ml':        self.jumlah_ml,  # alias untuk kompatibilitas frontend lama
            'tanggal':   str(self.tanggal),
        }


class MealTemplate(db.Model):
    """Tabel: meal_template — tidak ada sync_id, updated_at, deleted_at di Supabase."""
    __tablename__ = 'meal_template'

    id         = db.Column(db.Integer,     primary_key=True)
    user_id    = db.Column(db.Integer,     db.ForeignKey('users.id'), nullable=False)
    nama       = db.Column(db.String(120), nullable=False)
    deskripsi  = db.Column(db.Text,        nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)

    user  = db.relationship('User', backref='meal_templates', lazy=True)
    items = db.relationship('MealTemplateItem', backref='template', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':        self.id,
            'nama':      self.nama,
            'deskripsi': self.deskripsi or '',
            'items':     [i.to_dict() for i in self.items],
        }


class MealTemplateItem(db.Model):
    """Tabel: meal_template_item — hanya id, template_id, food_id, porsi di Supabase."""
    __tablename__ = 'meal_template_item'

    id          = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('meal_template.id'), nullable=False)
    food_id     = db.Column(db.Integer, db.ForeignKey('food.id'),          nullable=False)
    porsi       = db.Column(db.Integer, default=1)

    food = db.relationship('Food', lazy=True)

    def to_dict(self):
        return {
            'id':    self.id,
            'food':  self.food.to_dict() if self.food else {},
            'porsi': self.porsi,
        }


class StreakLog(db.Model):
    """Tabel: streak_log — tidak ada sync_id di Supabase."""
    __tablename__ = 'streak_log'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tanggal    = db.Column(db.Date,    nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)

    __table_args__ = (db.UniqueConstraint('user_id', 'tanggal', name='uq_streak_user_date'),)

    user = db.relationship('User', backref='streak_logs', lazy=True)