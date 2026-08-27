"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, PiggyBank, Target } from "lucide-react";
import { formatBRL } from "@/app/utils/investmentUtils";
import { MONTHS } from "@/app/hooks/useFinance";

interface CategoryData { name: string; icon: string; value: number; }
interface MonthPoint { month: string; gastos: number; renda: number; saldo: number; }

interface Props {
  selectedMonth: number;
  monthlyIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  sortedByCategory: CategoryData[];
  incomeVsExpenses: MonthPoint[];
}

type Insight = { icon: React.ElementType; color: string; text: string };

export function ResumoMensalIA({
  selectedMonth, monthlyIncome, totalExpenses, balance,
  savingsRate, sortedByCategory, incomeVsExpenses,
}: Props) {
  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];
    const mesNome = MONTHS[selectedMonth];
    const top = sortedByCategory[0];

    // 1. Categoria dominante
    if (top && totalExpenses > 0) {
      const pct = ((top.value / totalExpenses) * 100).toFixed(0);
      out.push({
        icon: TrendingUp,
        color: "#F97316",
        text: `Seu maior gasto em ${mesNome} foi ${top.icon} ${top.name}, representando ${pct}% do total (${formatBRL(top.value)}).`,
      });
    }

    // 2. Taxa de poupança
    if (monthlyIncome > 0) {
      if (savingsRate >= 20) {
        out.push({ icon: PiggyBank, color: "#10B981",
          text: `Excelente! Você economizou ${savingsRate.toFixed(0)}% da renda (${formatBRL(balance)}). Continue nesse ritmo.` });
      } else if (savingsRate >= 0) {
        out.push({ icon: Target, color: "#EAB308",
          text: `Você guardou ${savingsRate.toFixed(0)}% da renda. A meta ideal é 20% — tente cortar um pouco na categoria líder.` });
      } else {
        out.push({ icon: AlertTriangle, color: "#EF4444",
          text: `Atenção: seus gastos superaram a renda em ${formatBRL(Math.abs(balance))} neste mês.` });
      }
    }

    // 3. Comparação com mês anterior
    const atual = incomeVsExpenses[selectedMonth]?.gastos ?? 0;
    const anterior = selectedMonth > 0 ? incomeVsExpenses[selectedMonth - 1]?.gastos ?? 0 : 0;
    if (anterior > 0) {
      const diff = ((atual - anterior) / anterior) * 100;
      if (Math.abs(diff) >= 5) {
        const subiu = diff > 0;
        out.push({
          icon: subiu ? TrendingUp : TrendingDown,
          color: subiu ? "#EF4444" : "#10B981",
          text: `Seus gastos ${subiu ? "subiram" : "caíram"} ${Math.abs(diff).toFixed(0)}% em relação a ${MONTHS[selectedMonth - 1]} (${formatBRL(anterior)} → ${formatBRL(atual)}).`,
        });
      }
    }

    // 4. Mês de pico no ano
    const pico = incomeVsExpenses.reduce((a, b) => (b.gastos > a.gastos ? b : a), incomeVsExpenses[0]);
    if (pico && pico.gastos > 0 && pico.month === MONTHS[selectedMonth]) {
      out.push({ icon: AlertTriangle, color: "#F97316",
        text: `${mesNome} foi seu mês de maior gasto no ano até agora.` });
    }

    return out;
  }, [selectedMonth, monthlyIncome, totalExpenses, balance, savingsRate, sortedByCategory, incomeVsExpenses]);

  if (totalExpenses === 0 && monthlyIncome === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-orange-500/[0.06] to-pink-500/[0.06] border-orange-500/20">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm m-0">Resumo Inteligente</p>
            <p className="text-[#888] text-xs m-0">{MONTHS[selectedMonth]} · análise automática</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {insights.length === 0 ? (
            <p className="text-[#888] text-sm">Sem dados suficientes para gerar insights neste mês.</p>
          ) : (
            insights.map((ins, i) => {
              const Icon = ins.icon;
              return (
                <div key={i} className="flex items-start gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: ins.color }} />
                  <p className="text-[#ddd] text-[13px] leading-relaxed m-0">{ins.text}</p>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
