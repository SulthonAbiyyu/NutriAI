/**
 * utils/index.js
 *
 * Pure helper functions — tidak ada state, tidak ada side-effect.
 * Mudah di-unit test.
 */

// ─── Date & Time ──────────────────────────────────

/**
 * Format ISO date ke bahasa Indonesia
 * @param {string} iso
 * @param {'short'|'long'|'datetime'} format
 */
export function formatDate(iso, format = 'long') {
  const d = new Date(iso);
  if (format === 'short') {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
  if (format === 'datetime') {
    return d.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

/**
 * Apakah tanggal ini hari ini?
 */
export function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

// ─── Nutrition ────────────────────────────────────

/**
 * Hitung persentase pencapaian (clamp 0–100)
 */
export function calcProgress(current, target) {
  if (!target || target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

/**
 * Status BMI
 */
export function getBmiStatus(bmi) {
  if (bmi < 18.5) return { label: 'Kurus',      color: '#3B82F6' };
  if (bmi < 25)   return { label: 'Normal ✅',  color: '#10B981' };
  if (bmi < 30)   return { label: 'Overweight', color: '#F59E0B' };
  return              { label: 'Obesitas',    color: '#EF4444' };
}

/**
 * Config warna berdasarkan tujuan diet
 */
export function getTujuanConfig(tujuan) {
  const map = {
    bulking:  { label: '⬆ Bulking',  color: '#10B981', bg: '#ECFDF5' },
    cutting:  { label: '⬇ Cutting',  color: '#EF4444', bg: '#FEF2F2' },
    maintain: { label: '= Maintain', color: '#3B82F6', bg: '#EFF6FF' },
  };
  return map[tujuan] || map.maintain;
}

// ─── String ───────────────────────────────────────

/**
 * Ambil inisial dari username (max 2 karakter)
 * "Ahmad Rizky" → "AR", "budi" → "B"
 */
export function getInitials(name = '') {
  return name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
}

/**
 * Capitalize first letter
 */
export function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Number ───────────────────────────────────────

/**
 * Format angka dengan titik ribuan
 * 1500 → "1.500"
 */
export function formatNumber(num) {
  return num?.toLocaleString('id-ID') ?? '0';
}

/**
 * Clamp angka dalam range [min, max]
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
