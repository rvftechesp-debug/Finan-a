"use client";

import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import type { Expense } from "@/app/types";
import type { IncomeEntry } from "@/app/hooks/useFinance";
import { MONTHS } from "@/app/hooks/useFinance";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
}

export interface Mission extends Achievement {
  target: number;
  current: number;
  unit: string;
  reward: string;
}

export interface MonthSummary {
  monthIndex: number;
  income: number;
  expenses: number;
  balance: number;
  positive: boolean;
  hasData: boolean;
}

const monthKey = (dateStr: string) =>
  new Date(dateStr + "T00:00:00").getMonth();

// categorias consideradas "impulsivas" — ajuste conforme seu CATEGORIES real
const IMPULSE_CATEGORIES = ["Lazer", "Compras", "Delivery", "Outros"];

export function useGamification(
  expenses: Expense[],
  incomeEntries: IncomeEntry[]
) {
  // ── Resumo mês a mês ──────────────────────────────
  const monthlySummaries = useMemo<MonthSummary[]>(() => {
    return MONTHS.map((_, i) => {
      const inc = incomeEntries
        .filter(e => monthKey(e.date) === i)
        .reduce((s, e) => s + e.amount, 0);
      const exp = expenses
        .filter(e => monthKey(e.date) === i)
        .reduce((s, e) => s + e.amount, 0);
      const balance = inc - exp;
      return {
        monthIndex: i,
        income: inc,
        expenses: exp,
        balance,
        positive: inc > 0 && balance > 0,
        hasData: inc > 0 || exp > 0,
      };
    });
  }, [expenses, incomeEntries]);

  // ── Streak de economia (meses consecutivos positivos até hoje) ──
  const savingStreak = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    let streak = 0;
    for (let i = currentMonth; i >= 0; i--) {
      const m = monthlySummaries[i];
      if (!m.hasData) break;
      if (m.positive) streak++;
      else break;
    }
    return streak;
  }, [monthlySummaries]);

  // ── Meses positivos no total ──────────────────────
  const positiveMonths = useMemo(
    () => monthlySummaries.filter(m => m.positive).length,
    [monthlySummaries]
  );

  // ── Total economizado (soma dos saldos positivos) ──
  const totalSaved = useMemo(
    () =>
      monthlySummaries
        .filter(m => m.balance > 0)
        .reduce((s, m) => s + m.balance, 0),
    [monthlySummaries]
  );

  // ── Zero dívidas: nenhuma despesa vencida pendente ─
  const hasNoOverdue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !expenses.some(e => {
      if (e.status === "paid" || !e.due_date) return false;
      return new Date(e.due_date + "T00:00:00") < today;
    });
  }, [expenses]);

  const hasAnyData = expenses.length > 0 || incomeEntries.length > 0;

  // ── Conquistas ────────────────────────────────────
  const achievements = useMemo<Achievement[]>(() => [
    {
      id: "first-step",
      title: "Primeiro Passo",
      description: "Registrou seu primeiro lançamento",
      icon: "🎯",
      unlocked: hasAnyData,
    },
    {
      id: "streak-3",
      title: "3 Meses Economizando!",
      description: "Saldo positivo por 3 meses seguidos",
      icon: "🔥",
      unlocked: savingStreak >= 3,
      progress: Math.min((savingStreak / 3) * 100, 100),
    },
    {
      id: "streak-6",
      title: "Meio Ano no Azul!",
      description: "6 meses consecutivos economizando",
      icon: "🚀",
      unlocked: savingStreak >= 6,
      progress: Math.min((savingStreak / 6) * 100, 100),
    },
    {
      id: "no-debts",
      title: "Zero Dívidas!",
      description: "Nenhuma conta vencida em aberto",
      icon: "✅",
      unlocked: hasAnyData && hasNoOverdue,
    },
    {
      id: "saver-1k",
      title: "Poupador Iniciante",
      description: "Economizou mais de R$ 1.000 no total",
      icon: "💰",
      unlocked: totalSaved >= 1000,
      progress: Math.min((totalSaved / 1000) * 100, 100),
    },
    {
      id: "saver-10k",
      title: "Mestre da Poupança",
      description: "Economizou mais de R$ 10.000 no total",
      icon: "👑",
      unlocked: totalSaved >= 10000,
      progress: Math.min((totalSaved / 10000) * 100, 100),
    },
    {
      id: "consistent",
      title: "Consistente",
      description: "6 meses positivos ao longo do ano",
      icon: "⭐",
      unlocked: positiveMonths >= 6,
      progress: Math.min((positiveMonths / 6) * 100, 100),
    },
  ], [hasAnyData, savingStreak, hasNoOverdue, totalSaved, positiveMonths]);

  // ── MISSÕES COMPORTAMENTAIS ───────────────────────
  const missions = useMemo<Mission[]>(() => {
    const now = new Date();
    const cur = now.getMonth();

    // dias desde o último gasto impulsivo (máx. 7)
    const lastImpulse = expenses
      .filter(e => IMPULSE_CATEGORIES.includes(e.category))
      .map(e => e.date)
      .sort((a, b) => b.localeCompare(a))[0];
    const daysNoImpulse = lastImpulse
      ? Math.min(7, Math.floor(
          (Date.now() - new Date(lastImpulse + "T00:00:00").getTime()) / 86400000
        ))
      : 7;

    // delivery mês atual vs anterior
    const deliv = (m: number) =>
      expenses
        .filter(e => e.category === "Delivery" && monthKey(e.date) === m)
        .reduce((s, e) => s + e.amount, 0);
    const dNow = deliv(cur);
    const dPrev = deliv(cur - 1);
    const delivRed = dPrev > 0 ? Math.max(0, ((dPrev - dNow) / dPrev) * 100) : 0;

    const mk = (
      id: string,
      title: string,
      description: string,
      icon: string,
      current: number,
      target: number,
      unit: string,
      reward: string
    ): Mission => ({
      id: `mission_${id}`,
      title,
      description,
      icon,
      unit,
      reward,
      target,
      current,
      unlocked: current >= target,
      progress: Math.min(100, (current / target) * 100),
    });

    return [
      mk("no_impulse", "Sem impulsos", "7 dias sem gasto por impulso", "🎯",
         daysNoImpulse, 7, "dias", "Selo Autocontrole"),
      mk("no_late", "Em dia", "Nenhuma conta vencida em aberto", "📅",
         hasNoOverdue ? 30 : 0, 30, "dias", "Selo Pontualidade"),
      mk("reduce_delivery", "Menos delivery", "Reduza 20% vs mês passado", "🍔",
         Math.round(delivRed), 20, "%", "Selo Economia"),
    ];
  }, [expenses, hasNoOverdue]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // ── Detecção de conquistas/missões recém-desbloqueadas ──
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);
  const initialized = useRef(false);

  const STORAGE_KEY = "rv_seen_achievements";

  useEffect(() => {
    if (typeof window === "undefined") return;

    // achievements + missions no mesmo pipeline de toast
    const allUnlockables: Achievement[] = [...achievements, ...missions];
    const unlockedIds = allUnlockables
      .filter(a => a.unlocked)
      .map(a => a.id);

    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      seen = [];
    }

    // Primeira montagem: grava estado atual sem notificar
    if (!initialized.current) {
      initialized.current = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedIds));
      return;
    }

    const fresh = allUnlockables.filter(
      a => a.unlocked && !seen.includes(a.id)
    );

    if (fresh.length > 0) {
      setNewlyUnlocked(prev => [...prev, ...fresh]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedIds));
    }
  }, [achievements, missions]);

 const dismissToast = useCallback((id: string) => {
  setNewlyUnlocked(prev => prev.filter(a => a.id !== id));
}, []);


  return {
    achievements,
    missions,
    unlockedCount,
    savingStreak,
    positiveMonths,
    totalSaved,
    hasNoOverdue,
    monthlySummaries,
    newlyUnlocked,
    dismissToast,
  };
}
