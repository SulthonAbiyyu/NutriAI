import { useEffect, useState } from "react";
let NetInfo = null;
try {
  NetInfo = require("@react-native-community/netinfo").default;
} catch {}

export function useNetInfo() {
  const [state, setState] = useState({
    isConnected: true,
    isInternetReachable: true,
    type: "unknown",
  });

  useEffect(() => {
    if (!NetInfo) return;
    const unsubscribe = NetInfo.addEventListener((netState) => {
      setState({
        isConnected: netState.isConnected ?? true,
        isInternetReachable: netState.isInternetReachable ?? true,
        type: netState.type,
      });
    });
    NetInfo.fetch().then((netState) => {
      setState({
        isConnected: netState.isConnected ?? true,
        isInternetReachable: netState.isInternetReachable ?? true,
        type: netState.type,
      });
    });

    return unsubscribe;
  }, []);

  return {
    isOnline: state.isConnected && state.isInternetReachable !== false,
    isConnected: state.isConnected,
    connectionType: state.type,
  };
}
