"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
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
  status?: "pending" | "paid" | "canceled";
  due_date?: string | null;
  paid_at?: string | null;
}

const defaultBudgets: Budget[] = CATEGORIES.map(c => ({
  category: c.name,
  limit: 500,
}));

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export function useFinance(selectedMonth?: number) {
  const [userId, setUserId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>(defaultBudgets);
  const [loading, setLoading] = useState(true);

  const month = selectedMonth ?? new Date().getMonth();

  // ── Busca userId ──────────────────────────────────────────────────────────
  useEffect(() => {
    getCurrentUserId().then(setUserId);
  }, []);

  // ── Carrega dados do Supabase ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    async function load() {
      setLoading(true);
      try {
        const [expRes, incRes, budRes] = await Promise.all([
          supabase
            .from("expenses")
            .select("*")
            .eq("user_id", userId)
            .order("date", { ascending: false }),
          supabase
            .from("incomes")
            .select("*")
            .eq("user_id", userId)
            .order("date", { ascending: false }),
          supabase
            .from("budgets")
            .select("*")
            .eq("user_id", userId),
        ]);

        if (expRes.data) {
          setExpenses(
            expRes.data.map(e => ({
              id:                e.id,
              description:       e.description,
              category:          e.category,
              amount:            Number(e.amount),
              date:              e.date,
              attachment:        e.attachment ?? undefined,
              attachmentName:    e.attachment_name ?? undefined,
              cardName:          e.card_name ?? undefined,
              installments:      e.installments ?? undefined,
              installmentNumber: e.installment_number ?? undefined,
              // ✅ Campos de status e vencimento
              status:            e.status ?? "pending",
              due_date:          e.due_date ?? null,
              paid_at:           e.paid_at ?? null,
            }))
          );
        }

        if (incRes.data) {
          setIncomeEntries(
            incRes.data.map(e => ({
              id:             e.id,
              description:    e.description,
              type:           e.type,
              amount:         Number(e.amount),
              date:           e.date,
              attachment:     e.attachment ?? undefined,
              attachmentName: e.attachment_name ?? undefined,
              // ✅ Campos de status e vencimento
              status:         e.status ?? "pending",
              due_date:       e.due_date ?? null,
              paid_at:        e.paid_at ?? null,
            }))
          );
        }

        if (budRes.data && budRes.data.length > 0) {
          setBudgets(
            budRes.data.map(b => ({
              category: b.category,
              limit:    Number(b.limit),
            }))
          );
        } else if (userId) {
          // Primeiro acesso: cria orçamentos padrão
          await supabase.from("budgets").insert(
            defaultBudgets.map(b => ({
              user_id:  userId,
              category: b.category,
              limit:    b.limit,
            }))
          );
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  // ── Cálculos ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() =>
    expenses.filter(e => new Date(e.date + "T00:00:00").getMonth() === month),
    [expenses, month]
  );

  const filteredIncomes = useMemo(() =>
    incomeEntries.filter(e => new Date(e.date + "T00:00:00").getMonth() === month),
    [incomeEntries, month]
  );

  const monthlyIncome = useMemo(() =>
    filteredIncomes.reduce((s, e) => s + e.amount, 0),
    [filteredIncomes]
  );

  const income = useMemo(() =>
    incomeEntries.reduce((s, e) => s + e.amount, 0),
    [incomeEntries]
  );

  const totalExpenses = useMemo(() =>
    filtered.reduce((s, e) => s + e.amount, 0),
    [filtered]
  );

  const balance     = monthlyIncome - totalExpenses;
  const savingsRate = monthlyIncome > 0 ? (balance / monthlyIncome) * 100 : 0;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return CATEGORIES.map(c => ({ ...c, value: map[c.name] || 0 }));
  }, [filtered]);

  const byCategoryFiltered = useMemo(() =>
    byCategory.filter(c => c.value > 0), [byCategory]
  );

  const sortedByCategory = useMemo(() =>
    [...byCategoryFiltered].sort((a, b) => b.value - a.value), [byCategoryFiltered]
  );

  const topCategory = sortedByCategory[0];

  const monthlyData = useMemo(() =>
    MONTHS.map((m, i) => ({
      month: m,
      total: expenses
        .filter(e => new Date(e.date + "T00:00:00").getMonth() === i)
        .reduce((s, e) => s + e.amount, 0),
    })),
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

  const getTip = useCallback(() => {
    if (!topCategory || totalExpenses === 0) return null;
    return {
      icon:         topCategory.icon,
      categoryName: topCategory.name,
      pct:          ((topCategory.value / totalExpenses) * 100).toFixed(0),
      savings:      topCategory.value * 0.1,
    };
  }, [topCategory, totalExpenses]);

  const tip = getTip();

  // ── Mutations ─────────────────────────────────────────────────────────────

  // ✅ CORRIGIDO — agora aceita e persiste due_date
  const addExpense = useCallback(async (form: {
    description: string;
    category: string;
    amount: string;
    date: string;
    due_date?: string | null;
  }) => {
    if (!userId || !form.description || !form.amount || isNaN(parseFloat(form.amount)))
      return false;

    const newId = Date.now();
    const row = {
      id:          newId,
      user_id:     userId,
      description: form.description,
      category:    form.category,
      amount:      parseFloat(form.amount),
      date:        form.date,
      due_date:    form.due_date ?? null,  // ✅ persiste no banco
    };

    const { error } = await supabase.from("expenses").insert(row);
    if (error) { console.error(error); return false; }

    setExpenses(prev => [...prev, {
      id:          newId,
      description: form.description,
      category:    form.category,
      amount:      parseFloat(form.amount),
      date:        form.date,
      due_date:    form.due_date ?? null,  // ✅ atualiza estado local
      status:      "pending",
      paid_at:     null,
    }]);
    return true;
  }, [userId]);

  const removeExpense = useCallback(async (id: number) => {
    await supabase.from("expenses").delete().eq("id", id).eq("user_id", userId);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, [userId]);

  // ✅ CORRIGIDO — agora persiste due_date no update
  const updateExpense = useCallback(async (updated: Expense) => {
    await supabase.from("expenses").update({
      description:     updated.description,
      category:        updated.category,
      amount:          updated.amount,
      date:            updated.date,
      due_date:        updated.due_date ?? null,   // ✅ persiste no banco
      attachment:      updated.attachment ?? null,
      attachment_name: updated.attachmentName ?? null,
    }).eq("id", updated.id).eq("user_id", userId);

    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
  }, [userId]);

  const addIncome = useCallback(async (
    amount: string,
    description = "Receita",
    type = "Salário",
    date = new Date().toISOString().split("T")[0]
  ) => {
    if (!userId || !amount || isNaN(parseFloat(amount))) return false;

    const newId = Date.now();
    const value = parseFloat(amount);

    const { error } = await supabase.from("incomes").insert({
      id: newId, user_id: userId, description, type, amount: value, date,
    });
    if (error) { console.error(error); return false; }

    setIncomeEntries(prev => [...prev, { id: newId, description, type, amount: value, date }]);
    return true;
  }, [userId]);

  const removeIncome = useCallback(async (id: number) => {
    await supabase.from("incomes").delete().eq("id", id).eq("user_id", userId);
    setIncomeEntries(prev => prev.filter(e => e.id !== id));
  }, [userId]);

  const updateIncome = useCallback(async (updated: IncomeEntry) => {
    await supabase.from("incomes").update({
      description:     updated.description,
      type:            updated.type,
      amount:          updated.amount,
      date:            updated.date,
      attachment:      updated.attachment ?? null,
      attachment_name: updated.attachmentName ?? null,
    }).eq("id", updated.id).eq("user_id", userId);

    setIncomeEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
  }, [userId]);

  // ✅ markAsPaid — marca despesa ou receita como paga/pendente
  const markAsPaid = useCallback(async (
    type: "expense" | "income",
    id: number,
    paid: boolean
  ) => {
    const paidAt    = paid ? new Date().toISOString().split("T")[0] : null;
    const newStatus = paid ? "paid" : "pending";

    if (type === "expense") {
      const { error } = await supabase
        .from("expenses")
        .update({ status: newStatus, paid_at: paidAt })
        .eq("id", id)
        .eq("user_id", userId);

      if (!error) {
        setExpenses(prev =>
          prev.map(e =>
            e.id === id ? { ...e, status: newStatus, paid_at: paidAt } : e
          )
        );
      }
    } else {
      const { error } = await supabase
        .from("incomes")
        .update({ status: newStatus, paid_at: paidAt })
        .eq("id", id)
        .eq("user_id", userId);

      if (!error) {
        setIncomeEntries(prev =>
          prev.map(e =>
            e.id === id ? { ...e, status: newStatus, paid_at: paidAt } : e
          )
        );
      }
    }
  }, [userId]);

  const updateBudget = useCallback(async (category: string, limit: number) => {
    await supabase.from("budgets")
      .upsert({ user_id: userId, category, limit }, { onConflict: "user_id,category" });

    setBudgets(prev => prev.map(b => b.category === category ? { ...b, limit } : b));
  }, [userId]);

  return {
    loading,
    expenses,
    income,
    monthlyIncome,
    setIncome: () => {},
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
    markAsPaid,  // ✅
  };
}
