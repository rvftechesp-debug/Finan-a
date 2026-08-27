"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "rv_sound_volume";
const LAST_KEY = "rv_sound_last_volume";
const DEFAULT_VOLUME = 25;

export function useSoundPreference() {
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const lastNonZero = useRef(DEFAULT_VOLUME);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    const last = localStorage.getItem(LAST_KEY);
    if (saved !== null) {
      const n = parseInt(saved, 10);
      if (!isNaN(n)) setVolumeState(Math.max(0, Math.min(n, 100)));
    }
    if (last !== null) {
      const n = parseInt(last, 10);
      if (!isNaN(n) && n > 0) lastNonZero.current = n;
    }
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(value, 100));
    setVolumeState(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
    if (clamped > 0) {
      lastNonZero.current = clamped;
      localStorage.setItem(LAST_KEY, String(clamped));
    }
  }, []);

  // Mute/unmute: 0 -> restaura último volume | >0 -> muta
  const toggleMute = useCallback(() => {
    setVolume(volume > 0 ? 0 : lastNonZero.current || DEFAULT_VOLUME);
  }, [volume, setVolume]);

  // Atalho de teclado "M"
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ignora se estiver digitando em input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || editable) return;

      if (e.key.toLowerCase() === "m" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleMute();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleMute]);

  const normalized = volume / 100;
  const soundEnabled = volume > 0;

  return { volume, setVolume, toggleMute, normalized, soundEnabled };
}
