import api from '../config/api';

export const getTemplates = async () => {
  const res = await api.get('/api/templates');
  return res.data;
};

export const createTemplate = async (payload) => {
  const res = await api.post('/api/templates', payload);
  return res.data;
};

export const deleteTemplate = async (id) => {
  const res = await api.delete(`/api/templates/${id}`);
  return res.data;
};

export const useTemplate = async (id, waktu_makan) => {
  const res = await api.post(`/api/templates/${id}/use`, { waktu_makan });
  return res.data;
};
