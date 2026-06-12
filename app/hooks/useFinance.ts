"use client";

import { useMemo, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { Expense, Budget } from "@/app/types";

export const CATEGORIES = [
  { name: "Alimentação", icon: "🍽️", color: "#F97316" },
  { name: "Transporte",  icon: "🚗",  color: "#3B82F6" },
  { name: "Lazer",       icon: "🎮",  color: "#A855F7" },
  { name: "Moradia",     icon: "🏠",  color: "#10B981" },
  { name: "Assinaturas", icon: "📱",  color: "#EC4899" },
  { name: "Outros",      icon: "💡",  color: "#EAB308" },
];

export const MONTHS = [
  "Jan","Fev","Mar","Abr","Mai","Jun",
  "Jul","Ago","Set","Out","Nov","Dez",
];

export interface IncomeEntry {
  id: number;
  description: string;
  type: string;
  amount: number;
  date: string;
  attachment?: string;
  attachmentName?: string;
}

const defaultBudgets: Budget[] = CATEGORIES.map(c => ({
  category: c.name,
  limit: 500,
}));

// ─── hook ────────────────────────────────────────────────────────────────────

export function useFinance(selectedMonth?: number) {
  const userId = (() => {
    if (typeof window === "undefined") return "guest";
    try {
      const session = window.localStorage.getItem("financas-session");
      if (!session) return "guest";
      const parsed = JSON.parse(session);
      return parsed?.id ?? "guest";
    } catch {
      return "guest";
    }
  })();

  const expensesKey = `financas-expenses-${userId}`;
  const budgetsKey  = `financas-budgets-${userId}`;
  const incomesKey  = `financas-incomes-${userId}`;

  // ✅ FIX 1: removido initialExpenses hardcoded — array vazio para novos usuários
  // ✅ FIX 2: removida chave income separada — income calculado dinamicamente
  const [expenses,       setExpenses]       = useLocalStorage<Expense[]>(expensesKey, []);
  const [budgets,        setBudgets]        = useLocalStorage<Budget[]>(budgetsKey, defaultBudgets);
  const [incomeEntries,  setIncomeEntries]  = useLocalStorage<IncomeEntry[]>(incomesKey, []);

  const month = selectedMonth ?? new Date().getMonth();

  // ✅ FIX 3: income = soma real de TODAS as receitas cadastradas
  const income = useMemo(() =>
    incomeEntries.reduce((s, e) => s + e.amount, 0),
    [incomeEntries]
  );

  // Receitas do mês selecionado
  const filteredIncomes = useMemo(() =>
    incomeEntries.filter(e => new Date(e.date + "T00:00:00").getMonth() === month),
    [incomeEntries, month]
  );

  // Renda apenas do mês selecionado
  const monthlyIncome = useMemo(() =>
    filteredIncomes.reduce((s, e) => s + e.amount, 0),
    [filteredIncomes]
  );

  const filtered = useMemo(() =>
    expenses.filter(e => new Date(e.date + "T00:00:00").getMonth() === month),
    [expenses, month]
  );

  const totalExpenses = useMemo(() =>
    filtered.reduce((s, e) => s + e.amount, 0),
    [filtered]
  );

  // Saldo e taxa baseados no mês selecionado
  const balance     = monthlyIncome - totalExpenses;
  const savingsRate = monthlyIncome > 0 ? (balance / monthlyIncome) * 100 : 0;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return CATEGORIES.map(c => ({ ...c, value: map[c.name] || 0 }));
  }, [filtered]);

  const byCategoryFiltered = useMemo(() =>
    byCategory.filter(c => c.value > 0),
    [byCategory]
  );

  const sortedByCategory = useMemo(() =>
    [...byCategoryFiltered].sort((a, b) => b.value - a.value),
    [byCategoryFiltered]
  );

  const topCategory = sortedByCategory[0];

  const monthlyData = useMemo(() =>
    MONTHS.map((m, i) => {
      const total = expenses
        .filter(e => new Date(e.date + "T00:00:00").getMonth() === i)
        .reduce((s, e) => s + e.amount, 0);
      return { month: m, total };
    }),
    [expenses]
  );

  const incomeVsExpenses = useMemo(() =>
    MONTHS.map((m, i) => {
      const gastos = expenses
        .filter(e => new Date(e.date + "T00:00:00").getMonth() === i)
        .reduce((s, e) => s + e.amount, 0);
      const renda = incomeEntries
        .filter(e => new Date(e.date + "T00:00:00").getMonth() === i)
        .reduce((s, e) => s + e.amount, 0);
      return { month: m, gastos, renda, saldo: renda - gastos };
    }),
    [expenses, incomeEntries]
  );

  const budgetStatus = useMemo(() =>
    CATEGORIES.map(c => {
      const spent  = byCategory.find(b => b.name === c.name)?.value || 0;
      const budget = budgets.find(b => b.category === c.name)?.limit || 0;
      const pct    = budget > 0 ? (spent / budget) * 100 : 0;
      return { ...c, spent, budget, pct };
    }),
    [byCategory, budgets]
  );

  const addExpense = useCallback((form: {
    description: string;
    category: string;
    amount: string;
    date: string;
  }) => {
    if (!form.description || !form.amount || isNaN(parseFloat(form.amount))) return false;
    setExpenses(prev => [...prev, {
      ...form,
      id: Date.now(),
      amount: parseFloat(form.amount),
    }]);
    return true;
  }, [setExpenses]);

  const removeExpense = useCallback((id: number) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, [setExpenses]);

  const updateExpense = useCallback((updated: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
  }, [setExpenses]);

  // ✅ FIX 4: updateIncome não manipula mais income manualmente
  //    — recalculado automaticamente pelo useMemo
  const updateIncome = useCallback((updated: IncomeEntry, _oldAmount?: number) => {
    setIncomeEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
  }, [setIncomeEntries]);

  const updateBudget = useCallback((category: string, limit: number) => {
    setBudgets(prev =>
      prev.map(b => b.category === category ? { ...b, limit } : b)
    );
  }, [setBudgets]);

  const getTip = useCallback(() => {
    if (!topCategory || totalExpenses === 0) return null;
    const pct     = (topCategory.value / totalExpenses) * 100;
    const savings = topCategory.value * 0.1;
    return {
      icon: topCategory.icon,
      categoryName: topCategory.name,
      pct: pct.toFixed(0),
      savings,
    };
  }, [topCategory, totalExpenses]);

  const tip = getTip();

  const addIncome = useCallback((
    amount: string,
    description: string = "Receita",
    type: string = "Salário",
    date: string = new Date().toISOString().split("T")[0]
  ) => {
    if (!amount || isNaN(parseFloat(amount))) return false;
    const value = parseFloat(amount);
    setIncomeEntries(prev => [...prev, {
      id: Date.now(),
      description,
      type,
      amount: value,
      date,
    }]);
    return true;
  }, [setIncomeEntries]);

  // ✅ FIX 4: removeIncome não manipula mais income manualmente
  const removeIncome = useCallback((id: number, _amount?: number) => {
    setIncomeEntries(prev => prev.filter(e => e.id !== id));
  }, [setIncomeEntries]);

  return {
    expenses,
    income,
    monthlyIncome,
    setIncome: () => {}, // mantido para compatibilidade
    budgets,
    updateBudget,
    filtered,
    filteredIncomes,
    incomeEntries,
    totalExpenses,
    balance,
    savingsRate,
    byCategory,
    byCategoryFiltered,
    sortedByCategory,
    topCategory,
    monthlyData,
    incomeVsExpenses,
    budgetStatus,
    addExpense,
    removeExpense,
    updateExpense,
    addIncome,
    removeIncome,
    updateIncome,
    tip,
    CATEGORIES,
    MONTHS,
  };
}
