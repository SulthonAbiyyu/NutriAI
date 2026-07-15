import api from '../config/api';
import { WeightRepo } from '../db/repositories';
import { getMeta, META_KEYS } from '../db/LocalDB';

export const getWeightHistory = async (limit = 30) => {
  const userId = parseInt(await getMeta(META_KEYS.USER_ID) || '0');
  if (userId) {
    const local = await WeightRepo.getHistory(userId, limit);
    try {
      const res = await api.get(`/api/weight?limit=${limit}`);
      await WeightRepo.upsertFromServer(userId, res.data?.history || []);
      return res.data;
    } catch {
      return { history: local, _source: 'local' };
    }
  }
  const res = await api.get(`/api/weight?limit=${limit}`);
  return res.data;
};

export const addWeight = async (berat, catatan = null) => {
  const userId = parseInt(await getMeta(META_KEYS.USER_ID) || '0');
  if (userId) {
    await WeightRepo.upsertToday(userId, berat, catatan);
    try {
      const res = await api.post('/api/weight', { berat, catatan });
      return res.data;
    } catch {
      return { status: 'queued', _offline: true };
    }
  }
  const res = await api.post('/api/weight', { berat, catatan });
  return res.data;
};

// Alias untuk backward compatibility
export const getWeight = getWeightHistory;