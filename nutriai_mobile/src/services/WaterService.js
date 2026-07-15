import api from '../config/api';
import { WaterRepo } from '../db/repositories';
import { getMeta, META_KEYS } from '../db/LocalDB';

export const getWaterToday = async () => {
  const userId = parseInt(await getMeta(META_KEYS.USER_ID) || '0');
  if (userId) {
    const localTotal = await WaterRepo.getTodayTotal(userId);
    try {
      const res = await api.get('/api/water/today');
      return res.data;
    } catch {
      return { total_ml: localTotal, target_ml: 2000, _source: 'local' };
    }
  }
  const res = await api.get('/api/water/today');
  return res.data;
};

export const addWater = async (jumlah_ml) => {
  const userId = parseInt(await getMeta(META_KEYS.USER_ID) || '0');
  if (userId) {
    await WaterRepo.addEntry(userId, jumlah_ml);
    try {
      const res = await api.post('/api/water', { jumlah_ml });
      return res.data;
    } catch {
      return { status: 'queued', _offline: true };
    }
  }
  const res = await api.post('/api/water', { jumlah_ml });
  return res.data;
};