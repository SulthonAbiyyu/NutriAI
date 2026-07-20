import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_TIMEOUT, STORAGE_KEYS } from '../constants';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use(
  async (config) => {
    const url = config.url || '';
    const isAuthEndpoint =
      url.includes('/api/login') || url.includes('/api/register');

    if (!isAuthEndpoint) {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
      delete config.headers['Authorization'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let _onUnauthorized = null;

export const setUnauthorizedHandler = (fn) => {
  _onUnauthorized = fn;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    const isAuthEndpoint =
      url.includes('/api/login') || url.includes('/api/register');

    if (status === 401 && !isAuthEndpoint) {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN).catch(() => {});
      await AsyncStorage.removeItem(STORAGE_KEYS.USER).catch(() => {});
      _onUnauthorized?.();
    }

    return Promise.reject(error);
  }
);

export default api;