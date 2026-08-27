export type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: string // ISO
}

export type Goal = {
  id: string
  targetAmount: number
  savedAmount: number
}
export interface Expense {
  id: number;
  description: string;
  category: string;
  amount: number;
  date: string;
  attachment?: string;
  attachmentName?: string;
  cardName?: string;
  installments?: number;
  installmentNumber?: number;
  status?: "pending" | "paid" | "canceled";
  due_date?: string | null;
  paid_at?: string | null;
  source?: string | null;   // 👈 ADICIONAR
}
