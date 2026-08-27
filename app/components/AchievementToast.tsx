"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Achievement } from "@/app/hooks/useGamification";
import { useConfetti } from "@/app/hooks/useConfetti";
import { useAchievementSound } from "@/app/hooks/useSound";
import { useVibration } from "@/app/components/useVibration";

interface Props {
  achievements: Achievement[];
  onDismiss: (id: string) => void;
  soundEnabled: boolean;
  volume: number; // 0.0–1.0
}

export function AchievementToast({
  achievements,
  onDismiss,
  soundEnabled,
  volume,
}: Props) {
  const fireConfetti = useConfetti();
const playSound = useAchievementSound();
const vibrate = useVibration(); // ✅

const prevIds = useRef<Set<string>>(new Set());

useEffect(() => {
  const current = achievements.map(a => a.id);
  const hasNew = current.some(id => !prevIds.current.has(id));

  if (hasNew) {
    fireConfetti();
    playSound(soundEnabled, volume);
    if (soundEnabled) vibrate([80, 40, 120]);
  }
  prevIds.current = new Set(current);
}, [achievements, fireConfetti, playSound, vibrate, soundEnabled, volume]);


  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
      {achievements.map(a => (
        <ToastItem key={a.id} achievement={a} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  achievement,
  onDismiss,
}: {
  achievement: Achievement;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(achievement.id), 6000);
    return () => clearTimeout(timer);
  }, [achievement.id, onDismiss]);

  return (
    <div className="achievement-toast pointer-events-auto w-[320px] bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/20 p-4 flex items-center gap-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-pink-500/10 to-transparent animate-pulse" />
      <div className="relative w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-3xl flex-shrink-0 achievement-icon">
        {achievement.icon}
      </div>
      <div className="relative flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-orange-400 m-0">
          🎉 Conquista Desbloqueada!
        </p>
        <p className="font-bold text-white text-sm m-0 truncate">{achievement.title}</p>
        <p className="text-[#888] text-xs m-0 truncate">{achievement.description}</p>
      </div>
      <button
        onClick={() => onDismiss(achievement.id)}
        className="relative text-[#888] hover:text-white transition-colors cursor-pointer flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-pink-500 toast-progress" />
    </div>
  );
}
