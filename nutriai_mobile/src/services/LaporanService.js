import api from '../config/api';

export const getLaporan = async (page = 1, limit = 30) => {
  const res = await api.get(`/api/laporan?page=${page}&limit=${limit}`);
  return res.data;
};

export const buatLaporan = async () => {
  const res = await api.post('/api/laporan');
  return res.data;
};

export const resetAndReport = async () => {
  const res = await api.post('/api/laporan/reset');
  return res.data;
};

export const getWeeklyAnalysis = async () => {
  const res = await api.get('/api/ai/weekly-analysis');
  return res.data;
};
