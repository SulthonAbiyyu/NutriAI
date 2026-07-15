/**
 * hooks/useRefreshOnFocus.js  (v2 — fixed infinite loop)
 *
 * FIX: fn disimpan ke ref agar useFocusEffect tidak re-register
 * setiap kali fn berubah. Ini lapisan pertahanan kedua.
 */

import { useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export function useRefreshOnFocus(fn) {
  // Simpan fn ke ref - update tiap render tapi tidak trigger re-register
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }); // sengaja tanpa deps

  useFocusEffect(
    useCallback(() => {
      fnRef.current();
    }, []) // deps KOSONG = tidak pernah re-register
  );
}