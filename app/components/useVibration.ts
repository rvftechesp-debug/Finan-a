"use client";

import { useCallback } from "react";

export function useVibration() {
  // padrão: vibra-pausa-vibra (sensação de "conquista")
  const vibrate = useCallback((pattern: number | number[] = [80, 40, 120]) => {
    if (typeof window === "undefined") return;
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignora
      }
    }
  }, []);

  return vibrate;
}
