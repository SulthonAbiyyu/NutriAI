import api             from '../config/api';
import AsyncStorage    from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';


export const login = async (username, password) => {
  try {
    const res = await api.post('/api/login', { username, password });
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, res.data.token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER,  JSON.stringify(res.data.user));
    return res.data;
  } catch (error) {
    const msg = error.response?.data?.error || 'Login gagal, coba lagi';
    throw new Error(msg);
  }
};

export const register = async (payload) => {
  const res = await api.post('/api/register', payload);
  await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, res.data.token);
  await AsyncStorage.setItem(STORAGE_KEYS.USER,  JSON.stringify(res.data.user));
  return res.data;
};

export const logout = async () => {
  await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
};

export const getStoredUser = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  return raw ? JSON.parse(raw) : null;
};
