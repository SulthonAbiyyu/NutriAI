/**
 * constants/index.js
 *
 * Semua nilai konstanta app.
 * JANGAN hardcode string/angka di komponen — taruh di sini.
 */

// ─── API ──────────────────────────────────────────
export const API_TIMEOUT = 15000; // ms

// ─── Assets ───────────────────────────────────────
export const BG_IMAGE = require('../../assets/bg.png');

// Icon untuk QuickAccessGrid (dashboard). Satu sumber kebenaran — kalau
// mau ganti gambar, cukup ubah di sini, komponen tinggal pakai ICONS.xxx.
export const ICONS = {
  makanan:    require('../../assets/makanan.png'),
  tambahdata: require('../../assets/tambahdata.png'),
  laporan:    require('../../assets/laporan2.png'),
  profile:    require('../../assets/profile.png'),
  mic:        require('../../assets/mic.png'),
  speaker:    require('../../assets/speaker.png'),
  chatai:     require('../../assets/chatai.png'),
};

// ─── AsyncStorage Keys ────────────────────────────
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER:  'user',
};

// ─── Nutrition ────────────────────────────────────
export const WAKTU_MAKAN = ['Pagi', 'Siang', 'Sore', 'Malam'];

export const TUJUAN_OPTIONS = [
  { label: '⬆ Bulking',  value: 'bulking'  },
  { label: '⬇ Cutting',  value: 'cutting'  },
  { label: '= Maintain', value: 'maintain' },
];

export const AKTIVITAS_OPTIONS = [
  { label: 'Sangat Tidak Aktif', value: 'sangat_tidak_aktif' },
  { label: 'Aktivitas Ringan',   value: 'aktivitas_ringan'   },
  { label: 'Aktivitas Sedang',   value: 'aktivitas_sedang'   },
  { label: 'Aktivitas Berat',    value: 'aktivitas_berat'    },
];

export const BODY_TYPE_OPTIONS = [
  { label: 'Ectomorph', desc: 'Tubuh ramping, sulit tambah berat', value: 'ectomorph', icon: '🏃' },
  { label: 'Mesomorph', desc: 'Tubuh atletis, mudah tambah otot',  value: 'mesomorph', icon: '💪' },
  { label: 'Endomorph', desc: 'Tubuh berisi, mudah tambah lemak',  value: 'endomorph', icon: '🏋️' },
];

// ─── Display Labels ───────────────────────────────
export const LABEL_MAP = {
  tujuan: {
    bulking:  '⬆ Bulking',
    cutting:  '⬇ Cutting',
    maintain: '= Maintain',
  },
  aktivitas: {
    sangat_tidak_aktif: 'Sangat Tidak Aktif',
    aktivitas_ringan:   'Aktivitas Ringan',
    aktivitas_sedang:   'Aktivitas Sedang',
    aktivitas_berat:    'Aktivitas Berat',
  },
  tipe_tubuh: {
    ectomorph: 'Ectomorph 🏃',
    mesomorph: 'Mesomorph 💪',
    endomorph: 'Endomorph 🏋️',
  },
  gender: {
    laki_laki: 'Laki-laki',
    perempuan: 'Perempuan',
  },
};

// ─── Routes ───────────────────────────────────────
// Gunakan ini supaya tidak typo nama screen
export const ROUTES = {
  // Auth
  LOGIN:    'Login',
  REGISTER: 'Register',

  // Main tabs
  MAIN:         'Main',
  DASHBOARD:    'Dashboard',
  INPUT_MAKAN:  'InputMakanan',
  LAPORAN:      'Laporan',
  PROFIL:       'Profil',

  // Stack screens
  TAMBAH_DATA:    'TambahData',
  WEIGHT_TRACKER: 'WeightTracker',
  WATER_TRACKER:  'WaterTracker',
  AI_CHAT:        'AiChat',
  EDIT_PROFILE:     'EditProfile',
  MEAL_TEMPLATES:   'MealTemplates',
  STREAK:           'Streak',
  BARCODE_SCANNER:  'BarcodeScanner',
  JARVIS:           'Jarvis',
};