"""
check_supabase.py
─────────────────
Jalankan di folder project kamu:
  python check_supabase.py

Script ini akan:
1. Cek koneksi ke Supabase
2. Lihat semua user yang ada (username, password_hash, deleted_at)
3. Diagnosa kenapa login 401
"""

import os, sys
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌  SUPABASE_URL / SUPABASE_KEY tidak ditemukan di .env")
    sys.exit(1)

try:
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅  Koneksi Supabase OK")
except Exception as e:
    print(f"❌  Gagal konek: {e}")
    sys.exit(1)

# ── 1. Lihat semua user ───────────────────────────────────────────────────────
print("\n─── Tabel users ───────────────────────────────────────")
res = sb.table('users').select(
    'id, username, password_hash, deleted_at, created_at'
).execute()

users = res.data or []
if not users:
    print("⚠️  Tabel users KOSONG — belum ada user sama sekali!")
else:
    for u in users:
        pw   = u.get('password_hash') or ''
        flag = ''
        if not pw:
            flag = '  ← ❌ password_hash NULL/kosong → login PASTI GAGAL'
        elif not pw.startswith(('pbkdf2:', 'scrypt:', '$2b$', '$2a$', 'argon2')):
            flag = '  ← ⚠️  format hash tidak dikenal'
        else:
            flag = '  ← ✅ hash OK'
        deleted = f"  [DELETED: {u['deleted_at']}]" if u.get('deleted_at') else ''
        print(f"  id={u['id']}  username={u['username']!r:20s}  hash={pw[:30]}...{flag}{deleted}")

# ── 2. Test login username tertentu ──────────────────────────────────────────
print("\n─── Test manual login ─────────────────────────────────")
test_username = input("Masukkan username yang mau dicek (Enter = skip): ").strip()
if test_username:
    res2 = sb.table('users').select(
        'id, username, password_hash, deleted_at'
    ).eq('username', test_username).execute()

    found = res2.data or []
    if not found:
        print(f"  ❌  Username '{test_username}' TIDAK ADA di database")
    else:
        u = found[0]
        print(f"  ✅  Ditemukan: id={u['id']}")
        if u.get('deleted_at'):
            print(f"  ❌  User ini sudah di-soft-delete: {u['deleted_at']}")
        pw = u.get('password_hash') or ''
        if not pw:
            print("  ❌  password_hash NULL — user ini tidak bisa login lewat API")
            print("      Fix: jalankan query SQL berikut di Supabase SQL Editor:")
            print()
            print("      UPDATE users")
            print(f"      SET password_hash = crypt('PASSWORD_BARU', gen_salt('bf'))")
            print(f"      WHERE username = '{test_username}';")
            print()
            print("      Atau reset via endpoint /api/register ulang dengan username baru.")
        else:
            from werkzeug.security import check_password_hash
            test_pw = input("  Masukkan password untuk dicek: ")
            if check_password_hash(pw, test_pw):
                print("  ✅  Password COCOK — login seharusnya berhasil")
                print("     Kalau masih 401, masalah ada di JWT atau interceptor")
            else:
                print("  ❌  Password TIDAK COCOK dengan hash di DB")
                print("     Hash di DB:", pw[:60])

print("\n─── Selesai ────────────────────────────────────────────")
