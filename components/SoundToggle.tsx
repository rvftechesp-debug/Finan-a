"use client";

import { Volume2, VolumeX } from "lucide-react";

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export function SoundToggle({ enabled, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? "Som ativado" : "Som desativado"}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full transition-colors text-sm cursor-pointer ${
        enabled
          ? "bg-orange-500/20 text-orange-400"
          : "bg-white/[0.03] text-[#888] hover:text-white hover:bg-white/[0.05]"
      }`}
    >
      {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      <span className="hidden sm:inline">{enabled ? "Som" : "Mudo"}</span>
    </button>
  );
}
