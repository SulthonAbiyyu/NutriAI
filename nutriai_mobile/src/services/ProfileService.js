import api from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants";

export const getProfile = async () => {
  const res = await api.get("/api/profile");
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data));
  return res.data;
};

export const updateProfile = async (payload) => {
  const res = await api.put("/api/profile", payload);
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data));
  return res.data;
};

export const changePassword = async (
  password_lama,
  password_baru,
  konfirmasi,
) => {
  const res = await api.put("/api/profile/password", {
    password_lama,
    password_baru,
    konfirmasi,
  });
  return res.data;
};

export const updateProfilePicture = async (formData) => {
  const res = await api.post("/api/profile/picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
