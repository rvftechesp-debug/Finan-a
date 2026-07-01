// app/api/ai-insights/route.ts
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Periodo = "mes_atual" | "ultimos_3" | "ultimos_6";

export async function POST(req: NextRequest) {
  try {
    const { expenses, incomeEntries, budgets, selectedMonth, periodo = "ultimos_3" } =
      await req.json();

    const now = new Date();

    const filterLastNMonths = (data: any[], n: number) =>
      data.filter((e) => {
        const d = new Date(e.date + "T00:00:00");
        const diff =
          (now.getFullYear() - d.getFullYear()) * 12 +
          (now.getMonth() - d.getMonth());
        return diff >= 0 && diff < n;
      });

    const filterCurrentMonth = (data: any[]) =>
      data.filter((e) => {
        const d = new Date(e.date + "T00:00:00");
        return (
          d.getMonth() === (selectedMonth ?? now.getMonth()) &&
          d.getFullYear() === now.getFullYear()
        );
      });

    const MONTH_NAMES = [
      "Jan","Fev","Mar","Abr","Mai","Jun",
      "Jul","Ago","Set","Out","Nov","Dez",
    ];

    const nMonths: Record<Periodo, number> = {
      mes_atual: 1,
      ultimos_3: 3,
      ultimos_6: 6,
    };

    const filteredExpenses =
      periodo === "mes_atual"
        ? filterCurrentMonth(expenses)
        : filterLastNMonths(expenses, nMonths[periodo as Periodo]);

    const filteredIncomes =
      periodo === "mes_atual"
        ? filterCurrentMonth(incomeEntries)
        : filterLastNMonths(incomeEntries, nMonths[periodo as Periodo]);

    const months = periodo === "mes_atual" ? 1 : nMonths[periodo as Periodo];

    const monthlyBreakdown = Array.from({ length: months }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex =
        periodo === "mes_atual"
          ? (selectedMonth ?? now.getMonth())
          : date.getMonth();
      const year =
        periodo === "mes_atual" ? now.getFullYear() : date.getFullYear();

      const monthExpenses = expenses.filter((e: any) => {
        const d = new Date(e.date + "T00:00:00");
        return d.getMonth() === monthIndex && d.getFullYear() === year;
      });
      const monthIncomes = incomeEntries.filter((e: any) => {
        const d = new Date(e.date + "T00:00:00");
        return d.getMonth() === monthIndex && d.getFullYear() === year;
      });

      const totalExp = monthExpenses.reduce((s: number, e: any) => s + e.amount, 0);
      const totalInc = monthIncomes.reduce((s: number, e: any) => s + e.amount, 0);

      const byCategory: Record<string, number> = {};
      monthExpenses.forEach((e: any) => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      });

      return {
        month: MONTH_NAMES[monthIndex],
        year,
        totalExpenses: totalExp,
        totalIncome: totalInc,
        balance: totalInc - totalExp,
        byCategory,
      };
    }).reverse();

    const pending = filteredExpenses.filter((e: any) => e.status === "pending");

    const periodoLabel: Record<Periodo, string> = {
      mes_atual: "mês atual",
      ultimos_3: "últimos 3 meses",
      ultimos_6: "últimos 6 meses",
    };

    const payload = {
      periodo: periodoLabel[periodo as Periodo],
      currentMonth: MONTH_NAMES[selectedMonth ?? now.getMonth()],
      monthlyBreakdown,
      pendingExpenses: pending.map((e: any) => ({
        description: e.description,
        category: e.category,
        amount: e.amount,
        due_date: e.due_date ?? null,
      })),
      budgets,
      summary: {
        totalExpenses: filteredExpenses.reduce((s: number, e: any) => s + e.amount, 0),
        totalIncome:   filteredIncomes.reduce((s: number, e: any) => s + e.amount, 0),
        balance:
          filteredIncomes.reduce((s: number, e: any) => s + e.amount, 0) -
          filteredExpenses.reduce((s: number, e: any) => s + e.amount, 0),
      },
    };

    // ── Chamada Groq ──────────────────────────────────────────────────────────

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Você é um consultor financeiro pessoal. Analise os dados financeiros do usuário e forneça insights práticos, objetivos e personalizados em português. Seja direto e use valores reais dos dados. Estruture a resposta com: 1 resumo geral, pontos de atenção e 2-3 recomendações acionáveis.",
        },
        {
          role: "user",
          content: `Aqui estão meus dados financeiros dos ${periodoLabel[periodo as Periodo]}:\n\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const text = completion.choices[0]?.message?.content ?? "Não foi possível gerar análise.";

    return NextResponse.json({ insight: text });

  } catch (error: any) {
    console.error("[ai-insights] Erro:", error);
    return NextResponse.json(
      { error: error?.message ?? "Erro interno ao gerar análise." },
      { status: 500 }
    );
  }
}
