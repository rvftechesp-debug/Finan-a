import type { Expense } from "@/app/types";

interface PluggyTx {
  id: string;
  description: string;
  amount: number;      // negativo = saída, positivo = entrada
  date: string;        // ISO
  category?: string;
}

// mapeia categoria da Pluggy → suas CATEGORIES
function mapCategory(pluggyCat?: string): string {
  const c = (pluggyCat ?? "").toLowerCase();
  if (c.includes("food") || c.includes("restaurant")) return "Alimentação";
  if (c.includes("transport")) return "Transporte";
  if (c.includes("health")) return "Saúde";
  if (c.includes("shopping")) return "Compras";
  return "Outros";
}

export function mapPluggyToExpense(tx: PluggyTx): Partial<Expense> {
  return {
    description: tx.description,
    amount: Math.abs(tx.amount),
    category: mapCategory(tx.category),
    date: tx.date.split("T")[0],
  };
}

// separa entradas x saídas
export function splitPluggyTransactions(txs: PluggyTx[]) {
  const expenses = txs.filter(t => t.amount < 0).map(mapPluggyToExpense);
  const incomes = txs.filter(t => t.amount > 0).map(t => ({
    description: t.description,
    amount: t.amount,
    date: t.date.split("T")[0],
  }));
  return { expenses, incomes };
}
