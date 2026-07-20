import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { setUnauthorizedHandler } from "../config/api";
import { STORAGE_KEYS } from "../constants";
import { logout as authLogout } from "../services/AuthService";

let _initLocalDB = null,
  _setMeta = null,
  _META_KEYS = null,
  _UserRepo = null;
try {
  const LocalDB = require("../db/LocalDB");
  _initLocalDB = LocalDB.initLocalDB;
  _setMeta = LocalDB.setMeta;
  _META_KEYS = LocalDB.META_KEYS;
  const Repos = require("../db/repositories");
  _UserRepo = Repos.UserRepo;
} catch (e) {
  console.warn("[AuthContext] LocalDB tidak tersedia:", e?.message);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  useEffect(() => {
    if (!_initLocalDB) {
      setDbReady(true);
      return;
    }
    _initLocalDB()
      .then(() => {
        console.log("[Auth] DB ready");
        setDbReady(true);
      })
      .catch((e) => {
        console.warn("[Auth] DB init failed:", e?.message);
        setDbReady(true);
      });
  }, []);
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEYS.TOKEN)
      .then((token) => {
        setIsLoggedIn(!!token);
        return AsyncStorage.getItem(STORAGE_KEYS.USER);
      })
      .then((userRaw) => {
        if (userRaw) {
          try {
            const user = JSON.parse(userRaw);
            if (user?.id) setUserId(user.id);
          } catch {}
        }
      })
      .catch(() => setIsLoggedIn(false))
      .finally(() => setIsReady(true));
  }, []);
  const signOut = useCallback(async () => {
    try {
      await authLogout();
    } catch {}
    try {
      if (_setMeta && _META_KEYS) await _setMeta(_META_KEYS.USER_ID, "");
    } catch {}
    setUserId(null);
    setIsLoggedIn(false);
  }, []);
  const signIn = useCallback(async (userData = null) => {
    if (userData?.id) {
      setUserId(userData.id);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      } catch {}
      try {
        if (_setMeta && _META_KEYS)
          await _setMeta(_META_KEYS.USER_ID, String(userData.id));
      } catch {}
      try {
        if (_UserRepo) await _UserRepo.upsert(userData);
      } catch {}
    }
    setIsLoggedIn(true);
  }, []);
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isReady, userId, signIn, signOut, dbReady }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus digunakan di dalam <AuthProvider>");
  return ctx;
}
