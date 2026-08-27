"use client";

import { useEffect, useState, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function MuteFlash({ volume }: { volume: number }) {
  const [show, setShow] = useState(false);
  const firstRender = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const muted = volume === 0;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 1200);
    return () => clearTimeout(timer.current);
  }, [muted]); // reage só à troca mudo/desmudo

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] bg-[#1a1a2e]/95 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-2xl mute-flash">
      {muted ? (
        <VolumeX className="w-4 h-4 text-[#888]" />
      ) : (
        <Volume2 className="w-4 h-4 text-orange-400" />
      )}
      <span className="text-sm text-white font-medium">
        {muted ? "Som desativado" : `Volume ${volume}%`}
      </span>
    </div>
  );
}
