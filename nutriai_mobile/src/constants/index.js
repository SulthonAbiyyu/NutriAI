export const API_TIMEOUT = 15000;
export const BG_IMAGE = require("../../assets/bg.png");
export const LOGO = require("../../assets/logo.png");

export const LOGOTEKS = require("../../assets/logoteks.png");
export const KATAK = require("../../assets/katak.png");
export const ICONS = {
  makanan: require("../../assets/makanan.png"),
  tambahdata: require("../../assets/tambahdata.png"),
  laporan: require("../../assets/laporan2.png"),
  profile: require("../../assets/profile.png"),
  mic: require("../../assets/mic.png"),
  speaker: require("../../assets/speaker.png"),
  chatai: require("../../assets/chatai.png"),
  statistik: require("../../assets/statistik.png"),
  kalori: require("../../assets/kalori.png"),
  protein: require("../../assets/protein.png"),
  karbo: require("../../assets/karbo.png"),
  lemak: require("../../assets/lemak.png"),
  editProfileTitle: require("../../assets/editprofile.png"),
  mealTemplateTitle: require("../../assets/mealtemplate.png"),
  streakTitle: require("../../assets/streak.png"),
  waterTrackerTitle: require("../../assets/watertracker.png"),
  airTracker: require("../../assets/air.png"),
  weightTrackerTitle: require("../../assets/weighttracker.png"),
  timbangan: require("../../assets/mediumicon/timbangan.png"),
  beratbadan: require("../../assets/smallicon/beratbadan.png"),
  tinggibadan: require("../../assets/smallicon/tinggibadan.png"),
  umur: require("../../assets/smallicon/umur.png"),
  bmr: require("../../assets/smallicon/bmr.png"),
  datadiri: require("../../assets/mediumicon/laporan.png"),
  tracking: require("../../assets/mediumicon/tracking.png"),
  pengaturan: require("../../assets/mediumicon/pengaturan.png"),
  gender: require("../../assets/bigicon/gender.png"),
  aktifitas: require("../../assets/mediumicon/aktifitas.png"),
  tujuan: require("../../assets/mediumicon/tujuan.png"),
  tdee: require("../../assets/mediumicon/tdee.png"),
  weighttracker: require("../../assets/mediumicon/weighttracker.png"),
  watertracker: require("../../assets/mediumicon/watertracker.png"),
  streak: require("../../assets/mediumicon/streak.png"),
  mealtemplate: require("../../assets/mediumicon/mealtemplate.png"),
  editprofile: require("../../assets/mediumicon/editprofile.png"),
  gantipassword: require("../../assets/mediumicon/gantipassword.png"),
  logout: require("../../assets/mediumicon/logout.png"),
};
export const STORAGE_KEYS = {
  TOKEN: "token",
  USER: "user",
};
export const WAKTU_MAKAN = ["Pagi", "Siang", "Sore", "Malam"];

export const TUJUAN_OPTIONS = [
  { label: "⬆ Bulking", value: "bulking" },
  { label: "⬇ Cutting", value: "cutting" },
  { label: "= Maintain", value: "maintain" },
];

export const AKTIVITAS_OPTIONS = [
  { label: "Sangat Tidak Aktif", value: "sangat_tidak_aktif" },
  { label: "Aktivitas Ringan", value: "aktivitas_ringan" },
  { label: "Aktivitas Sedang", value: "aktivitas_sedang" },
  { label: "Aktivitas Berat", value: "aktivitas_berat" },
];

export const BODY_TYPE_OPTIONS = [
  {
    label: "Ectomorph",
    desc: "Tubuh ramping, sulit tambah berat",
    value: "ectomorph",
    icon: "🏃",
  },
  {
    label: "Mesomorph",
    desc: "Tubuh atletis, mudah tambah otot",
    value: "mesomorph",
    icon: "💪",
  },
  {
    label: "Endomorph",
    desc: "Tubuh berisi, mudah tambah lemak",
    value: "endomorph",
    icon: "🏋️",
  },
];

export const LABEL_MAP = {
  tujuan: {
    bulking: "⬆ Bulking",
    cutting: "⬇ Cutting",
    maintain: "= Maintain",
  },
  aktivitas: {
    sangat_tidak_aktif: "Sangat Tidak Aktif",
    aktivitas_ringan: "Aktivitas Ringan",
    aktivitas_sedang: "Aktivitas Sedang",
    aktivitas_berat: "Aktivitas Berat",
  },
  tipe_tubuh: {
    ectomorph: "Ectomorph 🏃",
    mesomorph: "Mesomorph 💪",
    endomorph: "Endomorph 🏋️",
  },
  gender: {
    laki_laki: "Laki-laki",
    perempuan: "Perempuan",
  },
};
export const ROUTES = {
  LOGIN: "Login",
  REGISTER: "Register",
  MAIN: "Main",
  DASHBOARD: "Dashboard",
  INPUT_MAKAN: "InputMakanan",
  LAPORAN: "Laporan",
  PROFIL: "Profil",
  TAMBAH_DATA: "TambahData",
  WEIGHT_TRACKER: "WeightTracker",
  WATER_TRACKER: "WaterTracker",
  AI_CHAT: "AiChat",
  EDIT_PROFILE: "EditProfile",
  MEAL_TEMPLATES: "MealTemplates",
  STREAK: "Streak",
  BARCODE_SCANNER: "BarcodeScanner",
  JARVIS: "Jarvis",
};
