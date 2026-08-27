"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Flame, Trophy, Lock, Target } from "lucide-react";
import { formatBRL } from "@/app/utils/investmentUtils";
import type { Achievement, Mission } from "@/app/hooks/useGamification";

interface Props {
  achievements: Achievement[];
  missions: Mission[];
  unlockedCount: number;
  savingStreak: number;
  totalSaved: number;
}

export function GamificacaoTab({
  achievements,
  missions,
  unlockedCount,
  savingStreak,
  totalSaved,
}: Props) {

  const missionsDone = missions.filter(m => m.unlocked).length;

  return (
    <div className="space-y-5">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Streak */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-pink-500/10 border-orange-500/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-[#888] text-[11px] uppercase tracking-wider font-medium">
                Streak de Economia
              </p>
              <p className="text-2xl font-extrabold text-orange-400 m-0">
                {savingStreak} {savingStreak === 1 ? "mês" : "meses"} 🔥
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conquistas */}
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-[#888] text-[11px] uppercase tracking-wider font-medium">
                Conquistas
              </p>
              <p className="text-2xl font-extrabold text-yellow-400 m-0">
                {unlockedCount}/{achievements.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total economizado */}
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-[#888] text-[11px] uppercase tracking-wider font-medium">
                Total Economizado
              </p>
              <p className="text-xl font-extrabold text-emerald-400 m-0">
                {formatBRL(totalSaved)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── MISSÕES COMPORTAMENTAIS ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-[#ccc] m-0">
              Missões Comportamentais
            </h3>
          </div>
          <span className="text-[11px] text-[#888]">
            {missionsDone}/{missions.length} concluídas
          </span>
        </div>

        {missions.map(m => (
          <Card
            key={m.id}
            className={`bg-white/[0.03] border transition-all ${
              m.unlocked ? "border-emerald-500/30" : "border-white/[0.07]"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{m.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white m-0">
                      {m.title}
                    </p>
                    <p className="text-[11px] text-[#888] m-0">
                      {m.description}
                    </p>
                  </div>
                </div>
                {m.unlocked && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                    ✅ Feito
                  </span>
                )}
              </div>

              <div className="bg-white/[0.07] rounded-full h-1.5 overflow-hidden mb-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${
                    m.unlocked
                      ? "bg-emerald-500"
                      : "bg-gradient-to-r from-orange-500 to-pink-500"
                  }`}
                  style={{ width: `${m.progress}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#888]">
                  {m.current}/{m.target} {m.unit}
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    m.unlocked ? "text-emerald-400" : "text-[#666]"
                  }`}
                >
                  {m.unlocked ? `✨ ${m.reward}` : m.reward}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Grid de badges ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-bold text-[#ccc] m-0">Conquistas</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {achievements.map(a => (
            <Card
              key={a.id}
              className={`border transition-all ${
                a.unlocked
                  ? "bg-gradient-to-br from-orange-500/10 to-pink-500/10 border-orange-500/30"
                  : "bg-white/[0.02] border-white/[0.06] opacity-60"
              }`}
            >
              <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl relative ${
                    a.unlocked ? "bg-orange-500/15" : "bg-white/5 grayscale"
                  }`}
                >
                  {a.unlocked ? a.icon : <Lock className="w-6 h-6 text-[#666]" />}
                </div>
                <p className="font-bold text-white text-sm m-0">{a.title}</p>
                <p className="text-[#888] text-xs m-0">{a.description}</p>

                {!a.unlocked && a.progress != null && a.progress > 0 && (
                  <div className="w-full mt-1">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${a.progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#666] mt-1">
                      {Math.round(a.progress)}%
                    </p>
                  </div>
                )}

                {a.unlocked && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    ✅ Desbloqueado
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
