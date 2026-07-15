import api from '../config/api';

export const getStreak = async () => {
  const res = await api.get('/api/streak');
  return res.data;
};
