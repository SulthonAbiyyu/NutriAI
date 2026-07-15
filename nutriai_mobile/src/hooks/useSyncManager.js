/**
 * hooks/useSyncManager.js  (v3 — fixed infinite loop)
 *
 * FIX: syncing state dipindah ke useRef agar tidak trigger re-render loop.
 * sync() tidak masuk deps array useEffect — pakai syncRef sebagai gantinya.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useNetInfo } from './useNetInfo';
import {
  runSync, getPendingCount, addSyncListener, registerBackgroundSync,
} from '../services/SyncEngine';
import { getMeta, META_KEYS } from '../db/LocalDB';

function isScheduledSyncTime(targetHour = 23) {
  const now = new Date();
  return now.getHours() === targetHour && now.getMinutes() < 5;
}

export function useSyncManager(userId) {
  const { isOnline }                   = useNetInfo();
  const [syncing, setSyncing]          = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync]        = useState(null);
  const [lastResult, setLastResult]    = useState(null);

  // ── Refs (tidak trigger re-render) ──────────────────
  const prevOnline  = useRef(null);
  const appState    = useRef(AppState.currentState);
  const syncingRef  = useRef(false);   // ← FIX: track syncing tanpa deps
  const isOnlineRef = useRef(isOnline);
  const userIdRef   = useRef(userId);

  // Sync refs dengan state terbaru
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);
  useEffect(() => { userIdRef.current   = userId;   }, [userId]);

  // ── Load initial ────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    getMeta(META_KEYS.LAST_SYNC_AT).then(setLastSync);
    getPendingCount(userId).then(setPendingCount);
  }, [userId]);

  // ── Listener dari SyncEngine ────────────────────────
  useEffect(() => {
    const remove = addSyncListener(async (result) => {
      setLastResult(result);
      const uid = userIdRef.current;
      if (uid) {
        const count = await getPendingCount(uid);
        setPendingCount(count);
        const ts = await getMeta(META_KEYS.LAST_SYNC_AT);
        setLastSync(ts);
      }
    });
    return remove;
  }, []); // ← kosong: listener tidak perlu re-register

  // ── Core sync function ──────────────────────────────
  // useCallback dengan deps MINIMAL — tidak pakai syncing state
  const sync = useCallback(async (triggeredBy = 'manual') => {
    const uid      = userIdRef.current;
    const online   = isOnlineRef.current;

    if (!uid || !online || syncingRef.current) return null;

    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await runSync({ userId: uid, triggeredBy });
      const count = await getPendingCount(uid);
      setPendingCount(count);
      return result;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []); // ← deps kosong: sync stabil, tidak pernah recreated

  // ── Trigger 1: Reconnect (offline → online) ─────────
  useEffect(() => {
    if (prevOnline.current === false && isOnline === true && userId) {
      sync('reconnect');
    }
    prevOnline.current = isOnline;
  }, [isOnline, userId]); // ← sync TIDAK ada di sini

  // ── Trigger 2: App foreground ───────────────────────
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', next => {
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active' &&
        isOnlineRef.current
      ) {
        sync('foreground');
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [userId]); // ← sync & isOnline TIDAK ada di sini

  // ── Trigger 3: Scheduled jam 23:00 ─────────────────
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(async () => {
      if (!isOnlineRef.current) return;
      const hourStr = await getMeta(META_KEYS.SYNC_HOUR);
      const target  = hourStr ? parseInt(hourStr) : 23;
      if (!isScheduledSyncTime(target)) return;
      const lastSyncAt = await getMeta(META_KEYS.LAST_SYNC_AT);
      if (lastSyncAt) {
        const last = new Date(lastSyncAt);
        const now  = new Date();
        if (last.toDateString() === now.toDateString() && last.getHours() >= target) return;
      }
      sync('scheduled');
    }, 60_000);
    return () => clearInterval(interval);
  }, [userId]); // ← sync & isOnline TIDAK ada di sini

  // ── Background sync ─────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    registerBackgroundSync().catch(() => {});
  }, [userId]);

  // ── Refresh pending count tiap 30 detik ────────────
  useEffect(() => {
    if (!userId) return;
    const iv = setInterval(() => {
      getPendingCount(userIdRef.current).then(setPendingCount);
    }, 30_000);
    return () => clearInterval(iv);
  }, [userId]);

  return { sync, syncing, isOnline, pendingCount, lastSync, lastResult };
}