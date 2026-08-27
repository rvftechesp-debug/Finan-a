"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface CustomCategory {
  name: string;
  icon: string;
  color: string;
}

const DEFAULT_EXPENSE_COLORS = [
  "#F97316", "#3B82F6", "#A855F7", "#10B981",
  "#EC4899", "#EAB308", "#EF4444", "#06B6D4",
];

const DEFAULT_INCOME_COLORS = [
  "#10B981", "#3B82F6", "#A855F7", "#F97316",
  "#EAB308", "#EC4899", "#06B6D4", "#EF4444",
];

export function useCustomCategories(userId: string) {
  const expKey = `financas-custom-expense-categories-${userId}`;
  const incKey = `financas-custom-income-categories-${userId}`;

  const [customExpenseCategories, setCustomExpenseCategories] = useLocalStorage<CustomCategory[]>(expKey, []);
  const [customIncomeCategories, setCustomIncomeCategories] = useLocalStorage<CustomCategory[]>(incKey, []);

  const addExpenseCategory = useCallback((name: string, icon: string) => {
    if (!name.trim()) return false;
    const color = DEFAULT_EXPENSE_COLORS[customExpenseCategories.length % DEFAULT_EXPENSE_COLORS.length];
    setCustomExpenseCategories(prev => [...prev, { name: name.trim(), icon, color }]);
    return true;
  }, [customExpenseCategories.length, setCustomExpenseCategories]);

  const removeExpenseCategory = useCallback((name: string) => {
    setCustomExpenseCategories(prev => prev.filter(c => c.name !== name));
  }, [setCustomExpenseCategories]);

  const addIncomeCategory = useCallback((name: string, icon: string) => {
    if (!name.trim()) return false;
    const color = DEFAULT_INCOME_COLORS[customIncomeCategories.length % DEFAULT_INCOME_COLORS.length];
    setCustomIncomeCategories(prev => [...prev, { name: name.trim(), icon, color }]);
    return true;
  }, [customIncomeCategories.length, setCustomIncomeCategories]);

  const removeIncomeCategory = useCallback((name: string) => {
    setCustomIncomeCategories(prev => prev.filter(c => c.name !== name));
  }, [setCustomIncomeCategories]);

  return {
    customExpenseCategories,
    customIncomeCategories,
    addExpenseCategory,
    removeExpenseCategory,
    addIncomeCategory,
    removeIncomeCategory,
  };
}
