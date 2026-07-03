import { NextRequest, NextResponse } from "next/server";
import {
  getMarketData,
  getInvestmentRecommendationPrompt,
  parseAnalysisResponse,
  generateRuleBasedAnalysis,
} from "@/app/utils/investmentUtils";

const META: Record<string, { icon: string; label: string; color: string }> = {
  rendaFixa: { icon: "💳", label: "Renda Fixa", color: "#3B82F6" },
  rendaVariavel: { icon: "📊", label: "Renda Variável", color: "#A855F7" },
  tesouroDireto: { icon: "🏛️", label: "Tesouro Direto", color: "#10B981" },
  bitcoin: { icon: "₿", label: "Bitcoin", color: "#F59E0B" },
};

// ✅ Recalcula amount sempre, ignorando o que o modelo retornou
function applyMeta(options: ReturnType<typeof generateRuleBasedAnalysis>["options"], value: number) {
  return options.map((opt) => ({
    ...opt,
    amount: (value * opt.allocation) / 100, // ✅ nunca será NaN/0
    ...META[opt.type],
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { value } = await request.json();

    if (!value || value <= 0) {
      return NextResponse.json(
        { error: "Valor de investimento inválido" },
        { status: 400 }
      );
    }

    const marketData = await getMarketData();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const analysis = generateRuleBasedAnalysis(value, marketData);
      return NextResponse.json({
        summary: analysis.summary,
        options: applyMeta(analysis.options, value),
        marketContext: {
          btcPrice: marketData.btcPrice,
          sentiment: marketData.sentiment,
          headlines: marketData.headlines,
        },
      });
    }

    const prompt = getInvestmentRecommendationPrompt(value, marketData);

    const models = [
      process.env.PREFERRED_MODEL || "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.0-pro",
    ];

    let analysisText = "";

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.2 },
          }),
        }
      );

      if (response.status === 429) {
        console.warn(`Rate limit em ${model}, tentando próximo modelo...`);
        continue;
      }

      if (!response.ok) {
        const error = await response.text();
        console.error(`Erro no modelo ${model}:`, response.status, error);
        continue;
      }

      const data = await response.json();
      analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      break;
    }

    if (!analysisText) {
      const analysis = generateRuleBasedAnalysis(value, marketData);
      return NextResponse.json({
        summary: analysis.summary,
        options: applyMeta(analysis.options, value),
        marketContext: {
          btcPrice: marketData.btcPrice,
          sentiment: marketData.sentiment,
          headlines: marketData.headlines,
        },
      });
    }

    // ✅ Passa value e marketData para o fallback interno do parse
    const parsed = parseAnalysisResponse(analysisText, value, marketData);

    return NextResponse.json({
      summary: parsed.summary,
      options: applyMeta(parsed.options, value), // ✅ recalcula amount
      marketContext: {
        btcPrice: marketData.btcPrice,
        sentiment: marketData.sentiment,
        headlines: marketData.headlines,
      },
    });
  } catch (error) {
    console.error("Erro na análise — detalhes:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao processar análise",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
