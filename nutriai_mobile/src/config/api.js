/**
 * config/api.js
 *
 * Axios instance terpusat.
 * - Auto attach Bearer token dari AsyncStorage
 * - Auto redirect ke Login saat 401 (token expired)
 * - Login & Register TIDAK inject token (tidak ada token saat itu)
 */

import axios        from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, API_TIMEOUT } from '../constants';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// ─── Request: inject token — SKIP untuk auth endpoints ──
api.interceptors.request.use(
  async (config) => {
    const url = config.url || '';
    // Login & register tidak butuh token — skip injeksi
    // (jika ada token lama di header, malah menyebabkan 401)
    const isAuthEndpoint =
      url.includes('/api/login') || url.includes('/api/register');

    if (!isAuthEndpoint) {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Pastikan tidak ada Authorization header sisa dari sesi lama
      delete config.headers.Authorization;
      delete config.headers['Authorization'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response: handle 401 ────────────────────────────────
let _onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { _onUnauthorized = fn; };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url    = error.config?.url || '';
    const isAuthEndpoint =
      url.includes('/api/login') || url.includes('/api/register');

    if (status === 401 && !isAuthEndpoint) {
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
      _onUnauthorized?.();
    }

    return Promise.reject(error);
  }
);

export default api;