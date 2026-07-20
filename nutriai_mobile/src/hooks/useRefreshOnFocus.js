import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef } from "react";

export function useRefreshOnFocus(fn) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useFocusEffect(
    useCallback(() => {
      fnRef.current();
    }, []),
  );
}
