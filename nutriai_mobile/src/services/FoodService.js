import api from '../config/api';

export const getFoods = async (search = '', page = 1, limit = 20) => {
  const q   = search ? `&q=${encodeURIComponent(search)}` : '';
  const res = await api.get(`/api/foods?page=${page}&limit=${limit}${q}`);
  return res.data; // { data, total, page, limit, total_pages }
};

export const addFood = async (formData) => {
  const res = await api.post('/api/foods', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// FIXED: pakai FormData + multipart agar bisa upload gambar
export const updateFood = async (id, formData) => {
  const res = await api.put(`/api/foods/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// BARU: hapus makanan (soft delete di backend)
export const deleteFood = async (id) => {
  const res = await api.delete(`/api/foods/${id}`);
  return res.data;
};