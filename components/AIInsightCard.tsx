// components/AIInsightCard.tsx
"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

type Periodo = "mes_atual" | "ultimos_3" | "ultimos_6";

interface AIInsightCardProps {
  expenses: any[];
  incomeEntries: any[];
  budgets: any[];
  selectedMonth: number;
}

export function AIInsightCard({
  expenses,
  incomeEntries,
  budgets,
  selectedMonth,
}: AIInsightCardProps) {
  const [periodo, setPeriodo]   = useState<Periodo>("mes_atual");
  const [insight, setInsight]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const periodoOptions: { value: Periodo; label: string }[] = [
    { value: "mes_atual",  label: "Mês atual"    },
    { value: "ultimos_3",  label: "Últimos 3 meses" },
    { value: "ultimos_6",  label: "Últimos 6 meses" },
  ];

  const fetchInsight = async () => {
    setLoading(true);
    setError(null);
    setInsight(null);
    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses, incomeEntries, budgets, selectedMonth, periodo }),
      });
      if (!res.ok) throw new Error("Erro na requisição");
      const data = await res.json();
      setInsight(data.insight);
    } catch {
      setError("Não foi possível carregar a análise. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const renderInsight = (text: string) =>
    text.split("\n").filter(Boolean).map((line, i) => {
      const isBold  = line.startsWith("**") || line.match(/^\d+\./);
      const cleaned = line.replace(/\*\*/g, "");
      return (
        <p
          key={i}
          className={`text-sm leading-relaxed ${
            isBold ? "font-semibold text-white mt-3" : "text-gray-300"
          }`}
        >
          {cleaned}
        </p>
      );
    });

  return (
    <div className="w-full flex flex-col gap-4">

      {/* Seletor de período + botão */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Botões de período */}
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {periodoOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setPeriodo(opt.value);
                setInsight(null); // limpa resultado ao trocar período
              }}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                periodo === opt.value
                  ? "bg-violet-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Botão de análise */}
        <button
          onClick={fetchInsight}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow-lg transition-all"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {loading ? "Analisando..." : "Análise IA"}
        </button>

        {/* Botão de refresh (só após ter resultado) */}
        {insight && !loading && (
          <button
            onClick={fetchInsight}
            className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition"
            title="Atualizar análise"
          >
            <RefreshCw size={15} />
          </button>
        )}
      </div>

      {/* Resultado */}
      {(loading || error || insight) && (
        <div className="w-full bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-xl">

          {/* Body */}
          <div className="p-5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={28} className="text-violet-400 animate-spin" />
                <p className="text-gray-400 text-sm">Analisando seus dados...</p>
              </div>
            )}
            {error && !loading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={fetchInsight}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm transition"
                >
                  Tentar novamente
                </button>
              </div>
            )}
            {insight && !loading && (
              <div className="space-y-1">{renderInsight(insight)}</div>
            )}
          </div>

          {/* Footer */}
          {insight && !loading && (
            <div className="px-5 pb-4">
              <p className="text-xs text-gray-500 text-center">
                {periodoOptions.find(p => p.value === periodo)?.label} · Powered by GPT-4o mini
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
