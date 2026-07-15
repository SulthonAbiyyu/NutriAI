import api from '../config/api';

export const getDashboard = async () => {
  const res = await api.get('/api/dashboard');
  return res.data;
};
