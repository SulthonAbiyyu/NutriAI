import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import api from "../config/api";
import { STORAGE_KEYS } from "../constants";
export const checkUsernameAvailability = async (username) => {
  const res = await api.get("/api/check-username", { params: { username } });
  return res.data.available;
};

export const login = async (username, password) => {
  try {
    const res = await api.post("/api/login", { username, password });
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, res.data.token);
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER,
      JSON.stringify(res.data.user),
    );
    return res.data;
  } catch (error) {
    const msg = error.response?.data?.error || "Login gagal, coba lagi";
    throw new Error(msg);
  }
};

export const register = async (payload) => {
  try {
    const res = await api.post("/api/register", payload);
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, res.data.token);
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER,
      JSON.stringify(res.data.user),
    );
    return res.data;
  } catch (error) {
    const msg = error.response?.data?.error || "Registrasi gagal, coba lagi";
    throw new Error(msg);
  }
};

export const logout = async () => {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN).catch(() => {});
  await AsyncStorage.removeItem(STORAGE_KEYS.USER).catch(() => {});
};

export const getStoredUser = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  return raw ? JSON.parse(raw) : null;
};
export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
};
