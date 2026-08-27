"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";

interface Props {
  volume: number;              // 0–100
  onChange: (value: number) => void;
  onPreview?: (vol01: number) => void; // toca amostra ao soltar
}

export function VolumeControl({ volume, onChange, onPreview }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const Icon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Volume das notificações"
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full transition-colors text-sm cursor-pointer ${
          volume > 0
            ? "bg-orange-500/20 text-orange-400"
            : "bg-white/[0.03] text-[#888] hover:text-white hover:bg-white/[0.05]"
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{volume}%</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl p-4 z-[110]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#888] uppercase tracking-wider font-bold">
              Volume
            </span>
            <span className="text-sm font-bold text-orange-400">{volume}%</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange(0)}
              className="text-[#888] hover:text-white cursor-pointer"
              title="Mudo"
            >
              <VolumeX className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={volume}
              onChange={e => onChange(Number(e.target.value))}
              onMouseUp={() => onPreview?.(volume / 100)}
              onTouchEnd={() => onPreview?.(volume / 100)}
              className="volume-slider flex-1"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #ec4899 ${volume}%, rgba(255,255,255,0.1) ${volume}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />

            <button
              onClick={() => onChange(100)}
              className="text-[#888] hover:text-white cursor-pointer"
              title="Máximo"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
