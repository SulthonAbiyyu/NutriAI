/**
 * services/SyncEngine.js
 *
 * ══════════════════════════════════════════════════════
 *  SYNC ENGINE — Jantung dari offline-first architecture
 * ══════════════════════════════════════════════════════
 *
 * Cara kerja:
 *
 *  1. WRITE:  Screen → Repo.insert/update → LocalDB (sync_status='pending')
 *  2. PUSH:   Baca semua pending → POST /api/sync/push → server simpan ke Supabase
 *             Server return acks [{sync_id, server_id}]
 *             → update LocalDB: set sync_status='synced', server_id=...
 *  3. PULL:   GET /api/sync/pull?since=last_sync_at
 *             Server return semua perubahan sejak timestamp itu
 *             → upsert ke LocalDB (conflict: updated_at terbaru menang)
 *  4. TRIGGER: Otomatis saat:
 *             a) Koneksi kembali online
 *             b) App kembali ke foreground
 *             c) Scheduled jam 23:00 (configurable)
 *             d) Manual tap oleh user
 *
 * Install:
 *   npx expo install expo-sqlite @react-native-community/netinfo
 *   npx expo install expo-background-fetch expo-task-manager (untuk scheduled sync)
 */

import api from '../config/api';
import NetInfo from '@react-native-community/netinfo';
import { getMeta, setMeta, META_KEYS, nowISO, getDB } from '../db/LocalDB';
import {
  FoodRepo, DailyRepo, WeightRepo, WaterRepo, LaporanRepo, UserRepo
} from '../db/repositories';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager    from 'expo-task-manager';

// ← CONSTANT HARUS DI SINI, SEBELUM defineTask
export const BACKGROUND_SYNC_TASK = 'NUTRIAI_BACKGROUND_SYNC';

let _getUserId = null;

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const userId = _getUserId ? await _getUserId() : null;
    if (!userId) return BackgroundTask.BackgroundTaskResult.NoData;
    const result = await runSync({ userId, triggeredBy: 'scheduled' });
    return result.success
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Failed;
  } catch (e) {
    console.warn('[SyncEngine] Background task error:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});


// ─── Singleton state ─────────────────────────────────
let _isSyncing = false;
let _listeners = []; // callback(syncResult)

export function addSyncListener(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function notifyListeners(result) {
  _listeners.forEach(fn => { try { fn(result); } catch { /* ignore */ } });
}

// ─── Pending count ───────────────────────────────────

export async function getPendingCount(userId) {
  if (!userId) return 0;
  try {
    const db = getDB();
    const rows = await Promise.all([
      db.getFirstAsync(`SELECT COUNT(*) as n FROM waktu_makan WHERE user_id=? AND sync_status='pending'`, [userId]),
      db.getFirstAsync(`SELECT COUNT(*) as n FROM weight_history WHERE user_id=? AND sync_status='pending'`, [userId]),
      db.getFirstAsync(`SELECT COUNT(*) as n FROM water_log WHERE user_id=? AND sync_status='pending'`, [userId]),
      db.getFirstAsync(`SELECT COUNT(*) as n FROM food WHERE sync_status='pending'`),
    ]);
    return rows.reduce((sum, r) => sum + (r?.n ?? 0), 0);
  } catch {
    return 0;
  }
}

// ─── PUSH ────────────────────────────────────────────

async function pushPendingData(userId) {
  const [foodLogs, weightLogs, waterLogs, foods] = await Promise.all([
    DailyRepo.getPending(userId),
    WeightRepo.getPending(userId),
    WaterRepo.getPending(userId),
    FoodRepo.getPending(),
  ]);

  const totalPending = foodLogs.length + weightLogs.length + waterLogs.length + foods.length;
  if (totalPending === 0) return { pushed: 0, acks: {} };

  const payload = {
    food_logs:   foodLogs.map(row => ({
      sync_id:      row.sync_id,
      server_id:    row.server_id,
      nama_makanan: row.nama_makanan,
      protein:      row.protein,
      kalori:       row.kalori,
      karbo:        row.karbo,
      lemak:        row.lemak,
      porsi:        row.porsi,
      waktu_makan:  row.waktu_makan,
      tanggal:      row.tanggal,
      catatan:      row.catatan,
      image:        row.image,
      deleted:      row.deleted === 1,
      updated_at:   row.updated_at,
    })),
    weight_logs: weightLogs.map(row => ({
      sync_id:   row.sync_id,
      server_id: row.server_id,
      berat:     row.berat,
      tanggal:   row.tanggal,
      catatan:   row.catatan,
      deleted:   row.deleted === 1,
      updated_at: row.updated_at,
    })),
    water_logs: waterLogs.map(row => ({
      sync_id:   row.sync_id,
      server_id: row.server_id,
      jumlah_ml: row.jumlah_ml,
      tanggal:   row.tanggal,
      deleted:   row.deleted === 1,
      updated_at: row.updated_at,
    })),
    new_foods: foods.map(row => ({
      sync_id:       row.sync_id,
      nama_makanan:  row.nama_makanan,
      protein:       row.protein,
      kalori:        row.kalori,
      karbo:         row.karbo,
      lemak:         row.lemak,
      serat:         row.serat,
      gram_per_porsi: row.gram_per_porsi,
      updated_at:    row.updated_at,
    })),
  };

  const res = await api.post('/api/sync/push', payload);
  const acks = res.data?.acks ?? {};

  // Update server_ids dari acks
  if (acks.food_logs?.length) {
    await DailyRepo.updateServerIds(acks.food_logs);
  }
  if (acks.new_foods?.length) {
    await FoodRepo.markSynced(acks.new_foods.map(a => a.sync_id));
  }
  if (acks.weight_logs?.length) {
    await WeightRepo.markSynced(
        acks.weight_logs.map(a => a.sync_id)
    );
  }
  if (acks.water_logs?.length) {
    await WaterRepo.markSynced(
        acks.water_logs.map(a => a.sync_id)
    );
  }

  return { pushed: totalPending };
}

// ─── PULL ────────────────────────────────────────────

async function pullServerChanges(userId) {
  const lastSync = await getMeta(META_KEYS.LAST_SYNC_AT);

  const url = lastSync
    ? `/api/sync/pull?since=${encodeURIComponent(lastSync)}`
    : '/api/sync/pull';

  const res = await api.get(url);
  const {
    food_logs   = [],
    weight_logs = [],
    water_logs  = [],
    laporan     = [],
    foods       = [],
    user        = null,
    server_time,
  } = res.data;

  await Promise.all([
    food_logs.length   ? DailyRepo.upsertFromServer(userId, food_logs)  : Promise.resolve(),
    weight_logs.length ? WeightRepo.upsertFromServer(userId, weight_logs) : Promise.resolve(),
    water_logs.length  ? WaterRepo.upsertFromServer(userId, water_logs)  : Promise.resolve(),
    laporan.length     ? LaporanRepo.upsertFromServer(userId, laporan)   : Promise.resolve(),
    foods.length       ? FoodRepo.upsertFromServer(foods)                : Promise.resolve(),
    user               ? UserRepo.upsert(user)                           : Promise.resolve(),
  ]);

  if (server_time) {
    await setMeta(META_KEYS.LAST_SYNC_AT, server_time);
  }

  return {
    pulled: food_logs.length + weight_logs.length + water_logs.length + laporan.length,
  };
}


async function logSync(triggeredBy, status, pushed, pulled, conflicts, errorMsg, durationMs) {
  try {
    await getDB().runAsync(
      `INSERT INTO sync_log (triggered_by, status, pushed, pulled, conflicts, error_msg, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [triggeredBy, status, pushed, pulled, conflicts, errorMsg ?? null, durationMs]
    );
  } catch { /* non-critical */ }
}

// ─── MAIN SYNC ───────────────────────────────────────

/**
 * Jalankan full sync (push → pull).
 *
 * @param {object} options
 * @param {number} options.userId - ID user dari AuthContext
 * @param {string} options.triggeredBy - 'reconnect' | 'foreground' | 'scheduled' | 'manual'
 * @returns {Promise<SyncResult>}
 */
export async function runSync({ userId, triggeredBy = 'manual' }) {
  if (_isSyncing) {
    console.log('[SyncEngine] Already syncing, skip');
    return { success: false, reason: 'already_running' };
  }

  // 🔎 CEK INTERNET DULU
  const net = await NetInfo.fetch();

  if (!net.isConnected || !net.isInternetReachable) {
    console.log('[SyncEngine] Offline, skip sync');
    return { success: false, reason: 'offline' };
  }

  _isSyncing = true;
  const startTime = Date.now();
  let pushed = 0, pulled = 0, conflicts = 0;

  try {
    console.log(`[SyncEngine] START (trigger: ${triggeredBy})`);

    // 1. Push pending data dulu
    const pushResult = await pushPendingData(userId);
    pushed = pushResult.pushed;

    // 2. Pull perubahan dari server
    const pullResult = await pullServerChanges(userId);
    pulled = pullResult.pulled;

    const duration = Date.now() - startTime;
    console.log(`[SyncEngine] DONE — pushed:${pushed} pulled:${pulled} (${duration}ms)`);

    await logSync(triggeredBy, 'success', pushed, pulled, 0, null, duration);

    const result = { success: true, pushed, pulled, conflicts: 0, triggeredBy };
    notifyListeners(result);
    return result;

  } catch (e) {
    const duration = Date.now() - startTime;
    const errMsg = e?.response?.data?.error || e?.message || 'Unknown error';
    console.warn('[SyncEngine] FAILED:', errMsg);

    await logSync(triggeredBy, 'failed', pushed, pulled, 0, errMsg, duration);

    const result = { success: false, error: errMsg, pushed, pulled, triggeredBy };
    notifyListeners(result);
    return result;

  } finally {
    _isSyncing = false;
  }
}

// ─── SYNC HISTORY (untuk settings/debug screen) ──────

export async function getSyncHistory(limit = 20) {
  try {
    return await getDB().getAllAsync(
      'SELECT * FROM sync_log ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  } catch {
    return [];
  }
}

// ─── SCHEDULED SYNC ──────────────────────────────────
/**
 * Simpan referensi getUserId untuk dipakai oleh background task.
 * Panggil ini SEKALI di App.js saat app mount.
 */
export function defineBackgroundSyncTask(getUserId) {
  _getUserId = getUserId;
}

/**
 * Register background fetch — minimal interval 15 menit (batasan OS).
 */
export async function registerBackgroundSync() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Available) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 60 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('[SyncEngine] Background sync registered ✓');
    }
  } catch (e) {
    console.warn('[SyncEngine] Register background sync failed:', e?.message);
  }
}

export async function unregisterBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  } catch { /* ignore */ }
}