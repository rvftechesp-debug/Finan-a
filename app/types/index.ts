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
}

export interface Income {
  id: number;
  description: string;
  category: string;
  amount: number;
  date: string;
}

export type Transaction =
  | ({ type: "expense" } & Expense)
  | ({ type: "income" } & Income);

export interface Category {
  name: string;
  icon: string;
  color: string;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface Investment {
  id: number;
  name: string;
  type: string;
  amount: number;
  currentValue: number;
  date: string;
}

export interface InvestmentOption {
  type: "rendaFixa" | "rendaVariavel" | "tesouroDireto" | "bitcoin";
  label: string;
  percentage: number;
  justification: string;
  risk: "baixo" | "médio" | "alto";
  expectedReturn: string;
  icon: string;
  color: string;
}

export interface InvestmentAnalysis {
  id: string;
  value: number;
  date: string;
  options: InvestmentOption[];
  summary: string;
  marketContext: {
    btcPrice: number;
    sentiment: "bullish" | "bearish" | "neutral";
    headlines: string[];
  };
}

export interface AppState {
  expenses: Expense[];
  income: number;
  budgets: Budget[];
}
