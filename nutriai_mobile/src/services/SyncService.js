/**
 * services/SyncService.js
 *
 * Handles offline → online sync.
 *
 * Cara kerja:
 * 1. Semua data yang dibuat saat offline disimpan ke queue di AsyncStorage
 * 2. Saat koneksi kembali, queue di-push ke server
 * 3. Server kembalikan data terbaru via /api/sync/pull
 *
 * Requires: @react-native-async-storage/async-storage (sudah ada)
 *
 * Queue key: 'sync_queue' → Array<SyncItem>
 * Last sync:  'sync_last'  → ISO string
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api          from '../config/api';

const QUEUE_KEY    = 'sync_queue';
const LAST_SYNC_KEY = 'sync_last';

// ─── Queue Management ────────────────────────────────

export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToQueue(type, data) {
  /**
   * type: 'food_log' | 'weight_log' | 'water_log'
   * data: payload yang akan dikirim ke server
   */
  try {
    const queue = await getQueue();
    const item  = {
      id:        `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      data,
      created_at: new Date().toISOString(),
    };
    queue.push(item);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return item.id;
  } catch (e) {
    console.warn('[SyncService] addToQueue error:', e);
    return null;
  }
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getLastSync() {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY) || null;
  } catch {
    return null;
  }
}

export async function setLastSync(iso = null) {
  const ts = iso || new Date().toISOString();
  await AsyncStorage.setItem(LAST_SYNC_KEY, ts);
  return ts;
}

// ─── Push (Offline → Server) ─────────────────────────

export async function pushQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return { pushed: 0, failed: 0 };

  // Kelompokkan per tipe
  const payload = {
    food_logs:   queue.filter(q => q.type === 'food_log')   .map(q => q.data),
    weight_logs: queue.filter(q => q.type === 'weight_log') .map(q => q.data),
    water_logs:  queue.filter(q => q.type === 'water_log')  .map(q => q.data),
  };

  try {
    await api.post('/api/sync/push', payload);
    await clearQueue();
    console.log(`[SyncService] Pushed ${queue.length} items`);
    return { pushed: queue.length, failed: 0 };
  } catch (e) {
    console.warn('[SyncService] pushQueue error:', e?.message);
    return { pushed: 0, failed: queue.length };
  }
}

// ─── Pull (Server → Local) ───────────────────────────

export async function pullFromServer() {
  const since = await getLastSync();
  const url   = since
    ? `/api/sync/pull?since=${encodeURIComponent(since)}`
    : '/api/sync/pull';

  try {
    const res = await api.get(url);
    const { food_logs, weight_logs, water_logs, server_time } = res.data;
    await setLastSync(server_time);
    console.log(`[SyncService] Pulled: ${food_logs?.length || 0} food, ${weight_logs?.length || 0} weight, ${water_logs?.length || 0} water`);
    return res.data;
  } catch (e) {
    console.warn('[SyncService] pullFromServer error:', e?.message);
    return null;
  }
}

// ─── Full Sync ───────────────────────────────────────

export async function syncAll() {
  /**
   * Urutan:
   * 1. Push queue dulu (data offline yang dibuat user)
   * 2. Pull data terbaru dari server
   * Return: { pushed, pulled, success }
   */
  try {
    const pushResult = await pushQueue();
    const pullResult = await pullFromServer();
    return {
      success: true,
      pushed:  pushResult.pushed,
      pulled:  pullResult
        ? (pullResult.food_logs?.length || 0) + (pullResult.weight_logs?.length || 0) + (pullResult.water_logs?.length || 0)
        : 0,
    };
  } catch (e) {
    return { success: false, pushed: 0, pulled: 0, error: e?.message };
  }
}

// ─── Queue Size (untuk badge di UI) ──────────────────

export async function getQueueSize() {
  const queue = await getQueue();
  return queue.length;
}