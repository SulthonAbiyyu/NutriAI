/**
 * hooks/useApi.js  (v2 — fixed infinite loop)
 *
 * FIX: apiFunc disimpan ke ref, bukan deps useCallback.
 * Ini memastikan execute() TIDAK pernah recreated walau apiFunc berubah.
 * 
 * Efeknya: useRefreshOnFocus(execute) tidak pernah loop,
 * bahkan kalau dipanggil dengan inline arrow: useApi(() => fn(1, 15))
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export function useApi(apiFunc) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Simpan apiFunc ke ref - ref update tidak trigger re-render
  const apiFuncRef = useRef(apiFunc);
  useEffect(() => {
    apiFuncRef.current = apiFunc;
  }); // sengaja tanpa deps - selalu update ref ke versi terbaru

  // execute STABIL - tidak pernah recreated walau apiFunc berubah
  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFuncRef.current(...args);
      setData(result);
      return result;
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Terjadi kesalahan';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []); // deps KOSONG = execute tidak pernah berubah = tidak ada loop

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}