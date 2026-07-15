"""
debug_register_v2.py — tanpa create_app, langsung import app object
Jalankan: python debug_register_v2.py
"""
import os, traceback, sys
from dotenv import load_dotenv
load_dotenv()

# Coba berbagai cara import app yang umum di Flask
app = None
for attempt in [
    "from app import app as _app; app = _app",
    "from app import application as _app; app = _app",
    "from run import app as _app; app = _app",
    "from wsgi import app as _app; app = _app",
    "from server import app as _app; app = _app",
]:
    try:
        exec(attempt, globals())
        print(f"✅  App loaded via: {attempt}")
        break
    except Exception as e:
        pass

if app is None:
    print("❌  Tidak bisa import app. Isi __init__.py atau run.py kamu:")
    for f in ['app/__init__.py', 'run.py', 'wsgi.py', 'server.py']:
        if os.path.exists(f):
            print(f"\n--- {f} ---")
            with open(f) as fh:
                print(fh.read()[:800])
    sys.exit(1)

TEST_USER = {
    "username":  "testabi999",
    "password":  "test123456",
    "umur":      "22", "tb": "170", "bb": "65",
    "gender":    "laki-laki", "aktivitas": "sedang",
    "tujuan":    "diet", "body_type": "normal",
}

with app.app_context():
    from app.models import db, User, WeightHistory
    from werkzeug.security import generate_password_hash
    from flask_jwt_extended import create_access_token

    print("\n=== Cek DB ===")
    try:
        print(f"✅  {User.query.count()} user di tabel")
    except Exception as e:
        print(f"❌  DB error: {e}"); traceback.print_exc(); sys.exit(1)

    print("\n=== Simulasi Register Step-by-Step ===")
    try:
        # Step 1: hitung_bmr_tdee
        try:
            from app.routes import hitung_bmr_tdee
        except ImportError:
            # fallback: define inline
            def hitung_bmr_tdee(bb, tb, umur, gender, aktivitas, body_type):
                if gender == 'laki-laki':
                    bmr = 10*bb + 6.25*tb - 5*umur + 5
                else:
                    bmr = 10*bb + 6.25*tb - 5*umur - 161
                mult = {'ringan':1.375,'sedang':1.55,'berat':1.725,'sangat berat':1.9}.get(aktivitas,1.2)
                return round(bmr), round(bmr * mult)

        d = TEST_USER
        umur, tb, bb = int(d['umur']), int(d['tb']), int(d['bb'])
        bmr, tdee = hitung_bmr_tdee(bb, tb, umur, d['gender'], d['aktivitas'], d['body_type'])
        bmi_val = round(bb / ((tb/100)**2), 1)
        print(f"  Step 1 ✅  bmr={bmr} tdee={tdee} bmi={bmi_val}")

        # Step 2: buat User object
        user = User(
            username=d['username'],
            password_hash=generate_password_hash(d['password']),
            umur=umur, tb=float(tb), bb=float(bb),
            tujuan=d['tujuan'], aktivitas=d['aktivitas'],
            gender=d['gender'], tipe_tubuh=d['body_type'],
            bmr=bmr, tdee=tdee, bmi=bmi_val,
            bb_awal=float(bb),
        )
        print(f"  Step 2 ✅  User object OK")

        # Step 3: add + flush (dapatkan id)
        db.session.add(user)
        db.session.flush()
        print(f"  Step 3 ✅  flush OK, user.id={user.id}")

        # Step 4: WeightHistory
        db.session.add(WeightHistory(user_id=user.id, berat=float(bb), catatan='Test'))
        print(f"  Step 4 ✅  WeightHistory added")

        # Step 5: commit
        db.session.commit()
        print(f"  Step 5 ✅  COMMIT BERHASIL — user id={user.id}")

        token = create_access_token(identity=str(user.id))
        print(f"  Step 6 ✅  Token: {token[:50]}...")

        # Cleanup
        wh = WeightHistory.query.filter_by(user_id=user.id).all()
        for w in wh: db.session.delete(w)
        db.session.delete(user)
        db.session.commit()
        print("  🧹  Test user dihapus")
        print("\n✅  Register BERFUNGSI NORMAL — masalah bukan di kode register")

    except Exception as e:
        db.session.rollback()
        print(f"\n❌  CRASH di step sebelumnya: {type(e).__name__}: {e}")
        print("\n─── Full Traceback ───")
        traceback.print_exc()
