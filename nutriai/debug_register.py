"""
debug_register.py
─────────────────
Jalankan di folder project:  python debug_register.py
Ini mensimulasikan register langsung via Flask app context,
sehingga traceback LENGKAP muncul di terminal.
"""

import os, traceback
from dotenv import load_dotenv
load_dotenv()

# Bootstrap Flask app
from app import create_app
app = create_app()

TEST_USER = {
    "username":  "testabi123",
    "password":  "test123456",
    "umur":      "22",
    "tb":        "170",
    "bb":        "65",
    "gender":    "laki-laki",
    "aktivitas": "sedang",
    "tujuan":    "diet",
    "body_type": "normal",
}

with app.app_context():
    from app.models import db, User, WeightHistory
    from werkzeug.security import generate_password_hash
    from app.routes import hitung_bmr_tdee
    from flask_jwt_extended import create_access_token

    print("=== Cek koneksi DB ===")
    try:
        count = User.query.count()
        print(f"✅  DB OK — {count} user di tabel")
    except Exception as e:
        print(f"❌  DB query gagal: {e}")
        traceback.print_exc()
        exit(1)

    print("\n=== Simulasi Register ===")
    try:
        data = TEST_USER
        umur, tb, bb = int(data['umur']), int(data['tb']), int(data['bb'])
        bmr, tdee = hitung_bmr_tdee(bb, tb, umur, data['gender'], data['aktivitas'], data['body_type'])
        bmi_val   = round(bb / ((tb / 100) ** 2), 1)
        print(f"  bmr={bmr}, tdee={tdee}, bmi={bmi_val}")

        user = User(
            username      = data['username'],
            password_hash = generate_password_hash(data['password']),
            umur=umur, tb=float(tb), bb=float(bb),
            tujuan        = data['tujuan'],
            aktivitas     = data['aktivitas'],
            gender        = data['gender'],
            tipe_tubuh    = data['body_type'],
            bmr=bmr, tdee=tdee, bmi=bmi_val,
            bb_awal       = float(bb),
        )
        print("  ✅  User object dibuat")

        db.session.add(user)
        db.session.flush()  # dapatkan user.id tanpa commit dulu
        print(f"  ✅  User flushed, id={user.id}")

        db.session.add(WeightHistory(
            user_id=user.id, berat=float(bb), catatan='Berat awal registrasi'
        ))
        db.session.commit()
        print(f"  ✅  BERHASIL! user.id={user.id}, username={user.username}")

        token = create_access_token(identity=str(user.id))
        print(f"  ✅  Token OK: {token[:40]}...")

        # Cleanup — hapus test user
        db.session.delete(user)
        db.session.commit()
        print("  🧹  Test user dihapus")

    except Exception as e:
        db.session.rollback()
        print(f"\n❌  ERROR: {e}")
        print("\n─── Traceback Lengkap ───")
        traceback.print_exc()
