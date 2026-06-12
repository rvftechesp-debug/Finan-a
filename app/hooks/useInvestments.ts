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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro na análise");
        }

        const result = await response.json();

        const newAnalysis: InvestmentAnalysis = {
          id: `analysis-${Date.now()}`,
          value,
          date: new Date().toISOString(),
          options: result.options,
          summary: result.summary,
          marketContext: result.marketContext,
        };

        setAnalyses((prev) => [newAnalysis, ...prev]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
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
