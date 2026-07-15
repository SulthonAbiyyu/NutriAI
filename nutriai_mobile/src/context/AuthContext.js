/**
 * AuthContext.js (v6)
 *
 * FIX:
 * 1. HAPUS semua api.defaults.headers manipulation — cukup interceptor di api.js
 *    yang baca AsyncStorage per-request. Manipulasi defaults menyebabkan token
 *    lama ter-inject ke request login → 401.
 * 2. Tambah `isReady` — true setelah AsyncStorage restore selesai.
 *    AppNavigator tunggu isReady sebelum render screen apapun.
 * 3. signIn() simpan userData, set isLoggedIn true. Token sudah ada di
 *    AsyncStorage dari AuthService.login() — interceptor akan baca otomatis.
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout as authLogout }   from '../services/AuthService';
import { setUnauthorizedHandler } from '../config/api';
import { STORAGE_KEYS }           from '../constants';

let _initLocalDB = null, _setMeta = null, _META_KEYS = null, _UserRepo = null;
try {
  const LocalDB = require('../db/LocalDB');
  _initLocalDB  = LocalDB.initLocalDB;
  _setMeta      = LocalDB.setMeta;
  _META_KEYS    = LocalDB.META_KEYS;
  const Repos   = require('../db/repositories');
  _UserRepo     = Repos.UserRepo;
} catch (e) {
  console.warn('[AuthContext] LocalDB tidak tersedia:', e?.message);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(null);  // null = belum cek
  const [isReady,    setIsReady]    = useState(false);  // true = restore selesai
  const [userId,     setUserId]     = useState(null);
  const [dbReady,    setDbReady]    = useState(false);

  // ── 1. Init LocalDB (tidak block restore) ──
  useEffect(() => {
    if (!_initLocalDB) { setDbReady(true); return; }
    _initLocalDB()
      .then(() => { console.log('[Auth] DB ready'); setDbReady(true); })
      .catch(e  => { console.warn('[Auth] DB init failed:', e?.message); setDbReady(true); });
  }, []);

  // ── 2. Restore session dari AsyncStorage ──
  //    Token dibaca oleh interceptor api.js per-request — tidak perlu set ke api.defaults.
  //    isReady = false sampai ini selesai supaya AppNavigator tidak render screen
  //    yang langsung fetch sebelum status login diketahui.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.TOKEN)
      .then(token => {
        setIsLoggedIn(!!token);
        return AsyncStorage.getItem(STORAGE_KEYS.USER);
      })
      .then(userRaw => {
        if (userRaw) {
          try {
            const user = JSON.parse(userRaw);
            if (user?.id) setUserId(user.id);
          } catch { /* ignore */ }
        }
      })
      .catch(() => setIsLoggedIn(false))
      .finally(() => setIsReady(true));
  }, []);

  // ── signOut ──
  const signOut = useCallback(async () => {
    try { await authLogout(); } catch { /* ignore */ }
    try { if (_setMeta && _META_KEYS) await _setMeta(_META_KEYS.USER_ID, ''); } catch { /* ignore */ }
    setUserId(null);
    setIsLoggedIn(false);
  }, []);

  // ── signIn ──
  //    AuthService.login() sudah simpan token ke AsyncStorage.
  //    Interceptor api.js akan baca token itu otomatis di request berikutnya.
  //    Tidak perlu set api.defaults — itu yang menyebabkan token inject ke login.
  const signIn = useCallback(async (userData = null) => {
    if (userData?.id) {
      setUserId(userData.id);
      try { await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData)); } catch { /* ignore */ }
      try { if (_setMeta && _META_KEYS) await _setMeta(_META_KEYS.USER_ID, String(userData.id)); } catch { /* ignore */ }
      try { if (_UserRepo) await _UserRepo.upsert(userData); } catch { /* ignore */ }
    }
    setIsLoggedIn(true);
  }, []);

  // ── Unauthorized handler (401 non-auth → auto signOut) ──
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isReady, userId, signIn, signOut, dbReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam <AuthProvider>');
  return ctx;
}