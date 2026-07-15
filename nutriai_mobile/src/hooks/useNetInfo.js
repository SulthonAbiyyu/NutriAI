/**
 * hooks/useNetInfo.js
 *
 * Deteksi status koneksi internet.
 * Requires: @react-native-community/netinfo
 * Install: npx expo install @react-native-community/netinfo
 *
 * Penggunaan:
 *   const { isOnline, isConnected } = useNetInfo();
 */

import { useState, useEffect } from 'react';

// Coba import NetInfo — optional, fallback ke 'selalu online' jika belum install
let NetInfo = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch {
  // Belum install — semua dianggap online
}

export function useNetInfo() {
  const [state, setState] = useState({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    if (!NetInfo) return; // Belum install, skip

    // Subscribe ke perubahan koneksi
    const unsubscribe = NetInfo.addEventListener(netState => {
      setState({
        isConnected:         netState.isConnected ?? true,
        isInternetReachable: netState.isInternetReachable ?? true,
        type:                netState.type,
      });
    });

    // Cek status awal
    NetInfo.fetch().then(netState => {
      setState({
        isConnected:         netState.isConnected ?? true,
        isInternetReachable: netState.isInternetReachable ?? true,
        type:                netState.type,
      });
    });

    return unsubscribe;
  }, []);

  return {
    isOnline: state.isConnected && (state.isInternetReachable !== false),
    isConnected: state.isConnected,
    connectionType: state.type,
  };
}