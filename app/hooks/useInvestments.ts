"use client";

import { useState, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { InvestmentAnalysis } from "@/app/types";

export interface UseInvestmentsReturn {
  analyses: InvestmentAnalysis[];
  loading: boolean;
  error: string | null;
  analyzing: boolean;
  analyze: (value: number) => Promise<void>;
  clearHistory: () => void;
  deleteAnalysis: (id: string) => void;
}

export function useInvestments(): UseInvestmentsReturn {
  const [analyses, setAnalyses] = useLocalStorage<InvestmentAnalysis[]>(
    "investmentAnalyses",
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = useCallback(
    async (value: number) => {
      if (value <= 0) {
        setError("Valor deve ser maior que 0");
        return;
      }

      setAnalyzing(true);
      setError(null);

      try {
        const response = await fetch("/api/investments/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Erro da API:", errorData);
          throw new Error(errorData.details || errorData.error || "Erro na análise");
        }

        const result = await response.json();

        const colors = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B"];
        const icons  = ["🏦", "📈", "🏛️", "₿"];

        const newAnalysis: InvestmentAnalysis = {
          id: `analysis-${Date.now()}`,
          value,
          date: new Date().toISOString(),
          summary: result.summary,
          marketContext: result.marketContext,
          options: result.options.map((opt: any, i: number) => ({
            label:          opt.title,
            percentage:     opt.allocation,
            color:          colors[i] ?? "#888",
            icon:           icons[i]  ?? "💰",
            risk:           opt.risk,
            justification:  opt.description,
            expectedReturn: opt.return,
          })),
        };

        setAnalyses((prev) => [newAnalysis, ...prev]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        console.error("Erro ao analisar investimento:", err);
      } finally {
        setAnalyzing(false);
      }
    },
    [setAnalyses]
  );

  const clearHistory = useCallback(() => {
    setAnalyses([]);
  }, [setAnalyses]);

  const deleteAnalysis = useCallback(
    (id: string) => {
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    },
    [setAnalyses]
  );

  return {
    analyses,
    loading,
    error,
    analyzing,
    analyze,
    clearHistory,
    deleteAnalysis,
  };
}
