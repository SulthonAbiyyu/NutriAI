/**
 * services/DailyService.js  (v2 — Offline-First)
 *
 * READ  → LocalDB dulu (instant, offline-safe)
 * WRITE → LocalDB dulu (sync_status='pending') → server jika online
 */

import api from '../config/api';
import { DailyRepo } from '../db/repositories';
import { getMeta, META_KEYS } from '../db/LocalDB';

export const getDaily = async (date = null) => {
  try {
    const userId = parseInt(await getMeta(META_KEYS.USER_ID) || '0');
    if (!userId) throw new Error('No user');

    const localData = await DailyRepo.getByDate(userId, date);

    try {
      const url = date ? `/api/daily?date=${date}` : '/api/daily';
      const res = await api.get(url);
      const serverData = res.data;

      if (serverData?.grouped) {
        const allItems = Object.values(serverData.grouped).flat();
        if (allItems.length > 0) {
          await DailyRepo.upsertFromServer(userId, allItems.map(item => ({
            id: item.id, food_id: item.food?.id,
            nama_makanan: item.food?.nama_makanan || item.nama_makanan,
            protein: item.food?.protein || 0, kalori: item.food?.kalori || 0,
            karbo: item.food?.karbo || 0, lemak: item.food?.lemak || 0,
            porsi: item.food?.porsi || 1, waktu_makan: item.waktu_makan,
            tanggal: date || new Date().toISOString().split('T')[0],
            sync_id: item.sync_id || null,
            updated_at: new Date().toISOString(), created_at: new Date().toISOString(),
          })));
        }
      }
      return serverData;
    } catch {
      return {
        grouped: localData.grouped, total_kalori: localData.total_kalori,
        total_protein: localData.total_protein, target_kalori: 0, target_protein: 0,
        _source: 'local',
      };
    }
  } catch {
    const url = date ? `/api/daily?date=${date}` : '/api/daily';
    const res = await api.get(url);
    return res.data;
  }
};

export const submitDaily = async (items) => {
  try {
    const userId = parseInt(await getMeta(META_KEYS.USER_ID) || '0');
    if (userId) {
      const inserted = await DailyRepo.insertBatch(userId, items);
      try {
        const res = await api.post('/api/daily', items);
        if (res.data?.ids && inserted.length === res.data.ids.length) {
          await DailyRepo.updateServerIds(
            inserted.map((ins, i) => ({ sync_id: ins.sync_id, server_id: res.data.ids[i] }))
          );
        }
        return res.data;
      } catch {
        return { status: 'queued', inserted: inserted.length, _offline: true };
      }
    }
    const res = await api.post('/api/daily', items);
    return res.data;
  } catch (e) { throw e; }
};

export const deleteDaily = async (id) => {
  const userId = parseInt(await getMeta(META_KEYS.USER_ID) || '0');
  if (userId) await DailyRepo.delete(id);
  try {
    const res = await api.delete(`/api/daily/${id}`);
    return res.data;
  } catch (e) {
    if (e?.response?.status === 404) return { status: 'already_deleted' };
    if (!e?.response) return { status: 'queued_delete', _offline: true };
    throw e;
  }
};

export const editDaily = async (id, data) => {
  const res = await api.put(`/api/daily/${id}`, data);
  return res.data;
};