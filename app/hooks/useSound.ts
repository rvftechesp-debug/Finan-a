"use client";

import { useCallback, useRef } from "react";

export function useAchievementSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  // enabled: liga/desliga | volume: 0.0 a 1.0
  const play = useCallback((enabled = true, volume = 0.25) => {
    if (typeof window === "undefined" || !enabled) return;

    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;

      const peak = Math.max(0, Math.min(volume, 1)); // clamp 0-1
      const notes = [523.25, 659.25, 783.99, 1046.5];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.value = freq;

        const start = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {
      // silencioso
    }
  }, []);

  return play;
}
