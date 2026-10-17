<p align="center">
  <img src="docs/images/logo.png" alt="NutriAI Logo" width="120" />
</p>

# 🥗 NutriAI

**Aplikasi nutrition tracker mobile dengan AI voice assistant "Jarvis"**

NutriAI adalah aplikasi mobile (tersedia untuk **Android** dan **iOS**) untuk tracking nutrisi dan kalori harian, dibangun dengan React Native (Expo) di sisi frontend dan Flask di sisi backend. Aplikasi ini dilengkapi dengan **Jarvis**, asisten AI voice-command (powered by Google Gemini) yang dapat mencatat, menghapus, dan menganalisis asupan makanan hanya lewat perintah suara — serta **AI Chat**, chatbot berbasis teks untuk konsultasi nutrisi personal.

🔗 **Live Backend:** [https://nutriai-37bw.onrender.com](https://nutriai-37bw.onrender.com)
📲 **Download APK:** lihat halaman [Releases](https://github.com/SulthonAbiyyu/NutriAI/releases/latest)
🍎 **iOS:** sudah tersedia, lihat [cara menjalankannya](#-menjalankan-versi-ios)

> ⏱️ Catatan: backend di-host di Render free tier, jadi server akan "tidur" saat tidak ada aktivitas selama beberapa saat. Request pertama setelah idle bisa butuh waktu lebih lama (±30–50 detik) untuk "bangun" kembali.

> 🍎 **Kabar baik: NutriAI kini tersedia untuk iOS!** Selain Android, aplikasi sekarang juga berjalan di iPhone, dengan fitur yang sama termasuk Jarvis voice assistant. Lihat [cara menjalankannya](#-menjalankan-versi-ios).

<p align="center">
  <img src="docs/images/ios1.png" width="220" alt="NutriAI di iOS - tampilan 1" />
  <img src="docs/images/ios2.png" width="220" alt="NutriAI di iOS - tampilan 2" />
</p>
<p align="center"><i>NutriAI berjalan di iPhone (build native iOS)</i></p>

---

## 📖 Latar Belakang

### Masalah
Mencatat asupan makanan secara konsisten adalah salah satu cara paling efektif untuk mengontrol berat badan dan pola makan, namun pada praktiknya banyak orang berhenti melakukannya di tengah jalan. Sebagian besar aplikasi nutrition tracker yang tersedia saat ini masih mengandalkan input manual: pengguna harus membuka aplikasi, mencari nama makanan satu per satu dari database, mengisi porsi, lalu menyimpannya — proses yang memakan waktu dan terasa merepotkan terutama saat sedang makan di luar, terburu-buru, atau tangan sedang tidak bebas (misalnya setelah olahraga). Friction sekecil ini yang sering membuat orang kehilangan konsistensi dan akhirnya berhenti mencatat sama sekali.

Masalah lain yang cukup umum ditemukan:
- Rekomendasi kalori/nutrisi yang generik dan tidak disesuaikan dengan kondisi fisik, target, maupun tingkat aktivitas masing-masing pengguna
- Fitur tanya-jawab atau chatbot (jika ada) biasanya berdiri sendiri, tidak benar-benar "tahu" data harian dan progres pengguna yang sesungguhnya

### Solusi
NutriAI dirancang untuk memangkas friction tersebut dengan pendekatan **voice-first**: lewat Jarvis, pengguna cukup bicara secara natural ("abis makan nasi goreng satu porsi") untuk langsung mencatat makanan, tanpa perlu buka-tutup form atau mengetik. Jarvis juga memahami konteks implisit di balik ucapan pengguna (mis. "laper nih" diterjemahkan jadi saran menu, "abis gym" diterjemahkan jadi saran tinggi protein), sehingga interaksinya terasa seperti bicara dengan asisten pribadi, bukan mengisi formulir.

Di sisi personalisasi, NutriAI menghitung BMR & TDEE otomatis (rumus Mifflin-St Jeor) berdasarkan data fisik dan tujuan tiap pengguna saat registrasi, lalu memakai angka ini sebagai dasar semua target dan rekomendasi — termasuk pada fitur AI Chat, yang menjawab pertanyaan seputar nutrisi dengan mempertimbangkan profil dan progres harian pengguna yang sebenarnya, bukan jawaban generik.

### Pengenalan Aplikasi
NutriAI ditujukan untuk siapa pun yang ingin membangun kebiasaan mencatat makan secara konsisten tanpa merasa terbebani oleh prosesnya — mulai dari yang sedang bulking/cutting, menjaga berat badan, maupun sekadar ingin lebih sadar terhadap pola makan hariannya. Selain pencatatan lewat suara, aplikasi ini tetap menyediakan jalur manual (pencarian database makanan, barcode scanner, meal template) bagi pengguna yang lebih nyaman dengan interaksi konvensional, sehingga kedua gaya penggunaan bisa saling melengkapi.

### Perbedaan dengan Aplikasi Sejenis
Dibanding aplikasi nutrition tracker pada umumnya, beberapa hal yang membedakan pendekatan NutriAI:

| Aspek | Aplikasi tracker pada umumnya | NutriAI |
|---|---|---|
| Cara mencatat makanan | Cari & input manual per item | Cukup bicara ke Jarvis, bisa juga manual |
| Rekomendasi/AI chat | Generik, tidak terhubung ke data pengguna | Personal, berbasis profil & progres harian real-time |
| Konfirmasi data baru | Data baru langsung masuk ke database | Ada alur konfirmasi (nama, gram per porsi, foto) dengan gizi yang dihitung ulang otomatis sebelum makanan baru disimpan, mencegah data sampah |
| Interaksi suara | Jarang tersedia atau sebatas dikte teks | Voice command dua arah dengan pemahaman konteks implisit, bisa dibatalkan kapan saja |

---

## ✨ Fitur Utama

### 🔐 Autentikasi
- Register & Login dengan JWT
- Validasi ketersediaan username **real-time** (debounced) saat pengisian form register, sebelum user submit
- Perhitungan otomatis **BMR & TDEE** (Mifflin-St Jeor) saat registrasi, berdasarkan berat, tinggi, umur, gender, tingkat aktivitas, dan tipe tubuh

### 🏠 Dashboard
- Ringkasan kalori & makronutrien harian (protein, karbo, lemak)
- Progress bar menuju target harian
- Breakdown asupan per waktu makan (Pagi/Siang/Sore/Malam)
- Info streak (konsistensi input harian)

### 🎯 Goal Tracking
- Progress bar visual menuju target berat badan, mendukung 3 tipe goal (Bulking/Cutting/Maintain) dengan perhitungan **arah-sadar** — progres tetap akurat baik untuk goal menambah berat (bulking) maupun mengurangi berat (cutting), bukan sekadar selisih absolut
- Modal **"Edit Goal"** langsung dari Dashboard untuk mengganti tujuan atau target berat kapan saja, tanpa harus masuk ke halaman pengaturan terpisah
- Terhubung otomatis dengan Weight Tracker — begitu berat badan baru dicatat, progress bar goal langsung ter-update mengikuti data terbaru

### 🎙️ Jarvis — AI Voice Command *(overlay)*
- Muncul sebagai popover mengambang di atas tombol Jarvis, diaktifkan lewat perintah suara
- Visual spectrum bar yang bereaksi ke level suara asli dari mic (bukan animasi dekoratif)
- Memahami konteks implisit (misal "laper nih" → saran menu, "abis gym" → saran tinggi protein)
- Bisa mencatat makanan, menghapus entry, mencatat air minum & berat badan, mendaftarkan makanan baru ke database, memakai meal template — semuanya lewat perintah suara
- **Pencocokan makanan divalidasi di server** — jika AI memilih makanan dari database yang namanya tidak sesuai dengan yang diucapkan (misal "kentang goreng" tercocok ke mi instan), hasilnya ditolak dan Jarvis menawarkan untuk menambahkan data baru, bukan mencatat makanan yang salah
- **Tambah data makanan baru lewat suara** — AI mengestimasi gizi (per 100 g) dan berat satu porsi yang lazim untuk makanan tersebut. Di form konfirmasi, **nama makanan, gram per porsi, dan foto** bisa disesuaikan sebelum disimpan, dan angka kalori/protein/karbo/lemak **dihitung ulang otomatis** mengikuti gram yang diisi
- Kartu loading "Mencari data …" tampil selama AI mencarikan data (dengan tombol batal), lalu langsung berganti ke form konfirmasi tanpa layar kosong di antaranya
- Foto makanan baru tersimpan di Supabase Storage, dan setelah menyimpan muncul notifikasi hasil (berhasil, atau tersimpan tetapi foto gagal diunggah)
- Menyimpan riwayat percakapan untuk pemahaman konteks lanjutan
- Rekaman bisa dibatalkan kapan saja, termasuk saat sedang diproses AI

### 💬 AI Chat — Chatbot Nutrisi *(halaman terpisah)*
- Tanya-jawab seputar nutrisi & pola makan, personal sesuai profil dan progress harian user
- Otomatis menolak topik di luar nutrisi/kesehatan

### 🍽️ Input Makanan
- Tambah makanan manual dari database makanan ke log harian
- Modal full-screen (bukan bottom sheet) untuk menghindari masalah keyboard overlap di Android

### 🗂️ Kelola Database Makanan
- List seluruh makanan dengan foto, pencarian, dan infinite scroll
- Tambah/edit/hapus makanan master (termasuk ganti foto) lewat satu modal form terpadu
- Proteksi data bawaan aplikasi — hanya makanan yang ditambahkan user sendiri yang bisa diedit/dihapus, mencegah data master rusak
- Penanda visual untuk makanan yang belum punya foto

### 📷 Barcode Scanner
- Scan barcode makanan kemasan

### 📋 Meal Templates
- Simpan kombinasi makanan favorit sebagai template
- Terapkan template ke waktu makan tertentu dengan sekali tap

### 💧 Water Tracker
- Catat asupan air harian, target otomatis berdasarkan berat badan (33ml/kg)

### ⚖️ Weight Tracker
- Catat & pantau perkembangan berat badan
- BMR/TDEE otomatis dihitung ulang setiap ada perubahan berat

### 🔥 Streak
- Menghitung hari berturut-turut user konsisten mencatat makanan, beserta rekor terpanjang

### 📊 Laporan
- Riwayat & rata-rata asupan nutrisi
- Analisis mingguan otomatis oleh AI (ringkasan pencapaian & saran)

### 👤 Profile
- Edit data diri & foto profil (upload ke Supabase Storage)
- Ganti password

### 🛠️ Admin CMS *(halaman terpisah, khusus admin)*
- **CRUD Database Makanan Master** — tambah, cari, edit, dan hapus data makanan global (nama, kalori, protein, karbo, lemak, serat, gram/porsi) yang dipakai bersama oleh semua pengguna
- **CRUD User** — kelola akun pengguna terdaftar
- Dibangun langsung di atas backend Flask yang sama (`nutriai/`), terpisah dari alur autentikasi aplikasi mobile

---

## 📱 Tampilan Aplikasi

> Semua screenshot di bawah menggunakan nama file asli sesuai yang ada di `docs/images/`.

### 🏠 Dashboard
<p align="center">
  <img src="docs/images/dashboard.jpg" width="200" alt="Dashboard" />
</p>
<p align="center"><i>Ringkasan kalori & makronutrien harian, progress bar menuju target</i></p>

### 🎯 Goal Tracking
<p align="center">
  <img src="docs/images/editgoal.jpg" width="200" alt="Edit Goal Modal" />
</p>
<p align="center"><i>Modal Edit Goal untuk mengganti tujuan (Bulking/Cutting/Maintain) & target berat badan kapan saja</i></p>

### 🎙️ Jarvis — Voice Command
<p align="center">
  <img src="docs/images/jarvis1.jpg" width="200" alt="Jarvis - Overlay Rekaman" />
  <img src="docs/images/jarvis2.jpg" width="200" alt="Jarvis - Proses AI" />
  <img src="docs/images/jarvis3.jpg" width="200" alt="Jarvis - Konfirmasi Hasil" />
</p>
<p align="center"><i>Overlay rekaman suara, spectrum bar real-time, hingga konfirmasi hasil pencatatan</i></p>

### 💬 AI Chat
<p align="center">
  <img src="docs/images/chatai.jpg" width="200" alt="AI Chat" />
</p>
<p align="center"><i>Chatbot nutrisi personal berbasis profil & progres harian user</i></p>

<details>
<summary><b>📸 Lihat tampilan halaman lainnya (Input Makanan, Tracker, Laporan, dll.)</b></summary>

### 🍽️ Input Makanan & Kelola Database Makanan
<p align="center">
  <img src="docs/images/makanan1.jpg" width="200" alt="List Database Makanan" />
  <img src="docs/images/makanan2.jpg" width="200" alt="Pencarian Makanan" />
  <img src="docs/images/tambahdata1.jpg" width="200" alt="Form Tambah Makanan" />
  <img src="docs/images/tambahdata2.jpg" width="200" alt="Form Tambah Makanan - detail nutrisi" />
</p>
<p align="center"><i>List makanan dengan pencarian & foto, serta form tambah/edit data makanan</i></p>

### 📷 Barcode Scanner
<p align="center">
  <img src="docs/images/barcode.jpeg" width="200" alt="Barcode Scanner" />
</p>
<p align="center"><i>Scan barcode makanan kemasan untuk mengambil data nutrisinya langsung</i></p>

### 📋 Meal Templates
<p align="center">
  <img src="docs/images/mealtemplates.jpg" width="200" alt="Meal Templates" />
</p>
<p align="center"><i>Simpan kombinasi makanan favorit sebagai template & terapkan dengan sekali tap</i></p>

### 💧 Water Tracker & ⚖️ Weight Tracker
<p align="center">
  <img src="docs/images/watertracker.jpg" width="200" alt="Water Tracker" />
  <img src="docs/images/weighttracker.jpg" width="200" alt="Weight Tracker" />
</p>
<p align="center"><i>Catat asupan air harian (target otomatis dari berat badan) & pantau perkembangan berat badan</i></p>

### 🔥 Streak & 📊 Laporan
<p align="center">
  <img src="docs/images/streak.jpg" width="200" alt="Streak" />
  <img src="docs/images/laporan.jpg" width="200" alt="Laporan" />
</p>
<p align="center"><i>Konsistensi mencatat harian (streak) & riwayat/analisis nutrisi mingguan oleh AI</i></p>

### 🔐 Autentikasi — Register & Login
<p align="center">
  <img src="docs/images/register1.jpg" width="200" alt="Register - langkah 1" />
  <img src="docs/images/register2.jpg" width="200" alt="Register - langkah 2" />
  <img src="docs/images/register3.jpg" width="200" alt="Register - langkah 3" />
  <img src="docs/images/register4.jpg" width="200" alt="Register - langkah 4" />
  <img src="docs/images/register5.jpg" width="200" alt="Register - langkah 5" />
</p>
<p align="center">
  <img src="docs/images/register6.jpg" width="200" alt="Register - langkah 6" />
  <img src="docs/images/register7.jpg" width="200" alt="Register - langkah 7" />
  <img src="docs/images/register8.jpg" width="200" alt="Register - langkah 8" />
  <img src="docs/images/register9.jpg" width="200" alt="Register - langkah 9" />
  <img src="docs/images/register10.jpg" width="200" alt="Register - langkah 10" />
</p>
<p align="center"><i>Alur registrasi bertahap (satu pertanyaan per layar) untuk mengisi data fisik & tujuan user</i></p>
<p align="center">
  <img src="docs/images/login.jpg" width="200" alt="Login" />
</p>
<p align="center"><i>Halaman login</i></p>

### 👤 Profile
<p align="center">
  <img src="docs/images/profile.jpg" width="200" alt="Profile" />
  <img src="docs/images/editprofile.jpg" width="200" alt="Edit Profile" />
  <img src="docs/images/editpassword.jpg" width="200" alt="Edit Password" />
</p>
<p align="center"><i>Lihat & edit data diri beserta foto profil, dan ganti password</i></p>

### 🛠️ Admin CMS
<p align="center">
  <img src="docs/images/admincms1.png" width="200" alt="Admin CMS - Database Makanan Master" />
  <img src="docs/images/admincms2.png" width="200" alt="Admin CMS - Kelola User" />
</p>
<p align="center"><i>CRUD Database Makanan Master & CRUD User, khusus akses admin</i></p>

</details>

---

## 🛠️ Tech Stack

### Frontend — `nutriai_mobile/`
| Kategori | Teknologi |
|---|---|
| Framework | React Native 0.83 + Expo SDK 55 |
| Platform | Android & iOS |
| Navigasi | React Navigation (bottom-tabs, stack) |
| Database lokal | AsyncStorage (cache sesi & profil) |
| Media & Voice Input | Expo Camera, Expo Audio, Expo Image Picker |
| Export | Expo Print + Expo Sharing (PDF) |
| Animasi & UI | React Native Reanimated, React Native SVG |

### Backend — `nutriai/`
| Kategori | Teknologi |
|---|---|
| Framework | Flask 3.1 |
| ORM & Migrasi | SQLAlchemy 2.0, Flask-Migrate |
| Autentikasi | Flask-JWT-Extended |
| Database | PostgreSQL via **Supabase** (psycopg2) |
| File Storage | Supabase Storage (foto profil & makanan) |
| AI | Google Gemini API (`gemini-2.5-flash`, output JSON terstruktur) |
| Deployment | Gunicorn (Render) |
| Scheduler | APScheduler |
| Admin CMS | Flask + Jinja2 templates (blueprint terpisah dalam backend yang sama) |

---

## 📁 Struktur Repo

```
NutriAI/
├── nutriai_mobile/          # Frontend - React Native (Expo)
│   ├── src/
│   │   ├── components/      # Komponen UI (common & layout)
│   │   ├── screens/
│   │   │   ├── auth/        # LoginScreen, RegisterScreen
│   │   │   └── main/        # DashboardScreen, AiChatScreen, dll
│   │   ├── services/        # API calls per fitur
│   │   ├── context/         # AuthContext
│   │   ├── hooks/            # useApi, useDisclosure, useNetInfo, dll
│   │   ├── navigation/        # AppNavigator
│   │   └── theme/            # Design tokens
│   └── app.json
│
└── nutriai/                 # Backend - Flask API
    ├── app/
    │   ├── models.py         # Skema database (sinkron dengan Supabase)
    │   ├── routes.py         # Endpoint utama (auth, food, daily, dashboard, dll)
    │   ├── ai_routes.py      # Endpoint AI (Jarvis, AI Chat, analisis)
    │   ├── admin_routes.py   # Endpoint & render Admin CMS (CRUD makanan master, CRUD user)
    │   └── templates/admin/  # Halaman Jinja2 Admin CMS
    ├── main.py                # Entry point Flask (dijalankan via gunicorn di Render)
    └── requirements.txt
```

---

## 🍎 Menjalankan Versi iOS

Versi iOS di-build langsung dari source yang sama dengan Android (`nutriai_mobile/`).

**Prasyarat:** macOS, Xcode (terpasang di `/Applications`), Node.js, serta iPhone yang tersambung (atau simulator).

```bash
cd nutriai_mobile
npm install
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer   # sekali saja
npx expo run:ios --device
```

Catatan:
- Folder native `ios/` dihasilkan otomatis oleh Expo saat build dan tidak disertakan di repo.
- Jalankan **salah satu** saja pada satu waktu: Xcode (tombol Run) atau `npx expo run:ios`. Keduanya sekaligus pada workspace yang sama membuat build gagal dengan error `unable to initiate PIF transfer session`.
- Ikon aplikasi iOS wajib **tanpa transparansi (alpha)**; `assets/icon.png` sudah dibuat opaque 1024×1024 untuk keperluan ini.

---

## 🌟 Kelebihan Teknis

**Autentikasi & Keamanan**
- Token JWT disuntikkan otomatis ke setiap request lewat Axios interceptor (bukan manual per-service call)
- Token JWT disimpan lewat `expo-secure-store` (Keychain di iOS, Keystore di Android) — terenkripsi di level OS, bukan `AsyncStorage` biasa yang bisa dibaca plaintext kalau device di-root/jailbreak
- Header `Authorization` sengaja dibersihkan di endpoint login/register untuk mencegah token lama ikut terkirim
- Auto sign-out saat token kedaluwarsa (401), sehingga sesi mati tidak membuat user "nyangkut"
- Restore sesi dari penyimpanan lokal ditunggu sampai selesai sebelum navigasi dirender, mencegah race condition status login
- Validasi kekuatan password dilakukan ulang di **server** (min. 8 karakter, wajib ada huruf & angka) — tidak hanya mengandalkan validasi di frontend yang bisa di-bypass dengan memanggil API langsung
- Rate limiting per-IP (in-memory) pada endpoint sensitif — register, login, dan pengecekan username — untuk menahan brute-force/spam otomatis
- Pesan error login dibuat generik ("Username atau password salah") tanpa membedakan username tidak ada vs password salah, supaya tidak bisa dipakai untuk enumerasi username
- Whitelist nilai enum (gender, tujuan, tingkat aktivitas, tipe tubuh) divalidasi di server agar data sampah/tidak valid tidak bisa tersimpan lewat panggilan API langsung
- Kunci Supabase `service_role` hanya disimpan sebagai environment variable di server (Render), tidak ada di kode aplikasi maupun riwayat git; file `.env` masuk `.gitignore` dan sudah diverifikasi tidak pernah ter-commit
- Pilihan makanan dari AI divalidasi ulang di server terhadap nama yang diucapkan user (mencegah salah catat akibat halusinasi/salah pilih AI)
- Validasi server pada data makanan baru dari Jarvis: rentang nilai gizi, panjang nama, batas gram per porsi, pengecekan duplikat tanpa karakter wildcard, serta batas format & ukuran foto (jpg/jpeg/png/webp, maks. 5 MB)
- Validasi input endpoint Jarvis: batas panjang teks, jenis MIME audio harus audio, dan bentuk/panjang riwayat percakapan diperiksa sebelum masuk ke prompt AI
- Penyimpanan makanan baru dibungkus transaksi dengan rollback saat gagal, sehingga kegagalan database tidak meninggalkan data setengah jadi

**UX Jarvis (Voice Command)**
- Visual spectrum bar merespons level suara asli dari mikrofon secara real-time
- Rekaman dapat dibatalkan kapan saja, termasuk saat request AI sedang diproses
- Posisi popover otomatis menyesuaikan saat rotasi layar/perubahan dimensi, tetap terkunci dalam batas layar
- Alur konfirmasi sebelum data makanan baru disimpan ke database komunal, mencegah data tidak valid masuk begitu saja

**Keandalan AI & Backend**
- Output Gemini dipaksa berformat JSON (`responseMimeType: application/json`) dan di-parse secara toleran; bila tetap gagal, server membalas fallback yang aman (meminta user mengulang) alih-alih error 500
- Retry otomatis dengan backoff saat Gemini membalas 429/500/503
- Anggaran "thinking" Gemini dibatasi supaya token output tidak habis dan jawaban tidak terpotong di tengah
- Koneksi database memakai `pool_pre_ping` dan `pool_recycle`, sehingga koneksi idle yang sudah basi otomatis dibuang (mencegah error SSL pada request pertama setelah idle)
- Pencatatan makan memakai tanggal WIB (UTC+7), jadi data yang dicatat dini hari tidak nyasar ke hari sebelumnya
- Kegagalan upload foto tidak membatalkan penyimpanan makanan; kegagalan dicatat lengkap di log server dan user diberi tahu

**Goal & Tracking**
- Perhitungan progress goal berbasis selisih bertanda (signed delta) terhadap berat awal & target, bukan nilai absolut — sehingga tetap valid dan konsisten untuk goal dua arah (naik maupun turun berat badan)
- Data berat badan tersinkron satu sumber kebenaran (`users.bb`) antara Dashboard, Goal Card, dan Weight Tracker, termasuk presisi desimal yang konsisten di semua tampilan
- Target asupan air minum dihitung otomatis mengikuti berat badan terbaru (33ml/kg), ikut ter-update begitu berat badan berubah

---

## ⚠️ Kekurangan

- Versi **iOS** saat ini didistribusikan sebagai build dari source (Xcode / `expo run:ios`), belum tersedia lewat App Store maupun TestFlight
- Data gizi makanan baru yang ditambahkan lewat Jarvis adalah **estimasi AI** (ditandai belum terverifikasi), jadi sebaiknya dicek ulang
- Backend di Render free tier, sehingga request pertama setelah idle bisa lambat (cold start)

---

## 📄 License

**Proprietary — All Rights Reserved**

Copyright © 2026 Muhammad Sulthon Abiyyu. Seluruh kode, desain, dan aset dalam repository ini adalah milik pribadi dan dilindungi hak cipta. Dilarang menyalin, mendistribusikan, memodifikasi, atau menggunakan sebagian maupun seluruh isi project ini — baik untuk tujuan komersial maupun non-komersial — tanpa izin tertulis dari pemilik.
