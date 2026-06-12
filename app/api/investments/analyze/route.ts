import { NextRequest, NextResponse } from "next/server";
import {
  getMarketData,
  getInvestmentRecommendationPrompt,
  parseAnalysisResponse,
  generateRuleBasedAnalysis,
} from "@/app/utils/investmentUtils";

export async function POST(request: NextRequest) {
  try {
    const { value } = await request.json();

    if (!value || value <= 0) {
      return NextResponse.json(
        { error: "Valor de investimento inválido" },
        { status: 400 }
      );
    }

    // Obter dados de mercado
    const marketData = await getMarketData();

    // Validar API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Sem chave: executar analisador rule-based offline
      const analysis = generateRuleBasedAnalysis(value, marketData);
      const optionsWithMeta = analysis.options.map((opt) => {
        const meta: Record<
          string,
          { icon: string; label: string; color: string }
        > = {
          rendaFixa: { icon: "💳", label: "Renda Fixa", color: "#3B82F6" },
          rendaVariavel: { icon: "📊", label: "Renda Variável", color: "#A855F7" },
          tesouroDireto: { icon: "🏛️", label: "Tesouro Direto", color: "#10B981" },
          bitcoin: { icon: "₿", label: "Bitcoin", color: "#F59E0B" },
        };
        return { ...opt, ...meta[opt.type] };
      });

      return NextResponse.json({
        summary: analysis.summary,
        options: optionsWithMeta,
        marketContext: {
          btcPrice: marketData.btcPrice,
          sentiment: marketData.sentiment,
          headlines: marketData.headlines,
        },
      });
    }

    // Gerar prompt customizado
    const prompt = getInvestmentRecommendationPrompt(value, marketData);

    // Chamar OpenAI Chat Completions
    const payload = { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify({ model: process.env.PREFERRED_MODEL || "gpt-4o-mini", messages: [ { role: "user", content: prompt } ], max_tokens: 1000, temperature: 0.2, }), }; const response = await callOpenAI(apiKey, payload);

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", response.status, error);
      return NextResponse.json(
        { error: "Erro ao chamar OpenAI API" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const analysisText = data?.choices?.[0]?.message?.content ?? "";

    // Parsear resposta
    const analysis = parseAnalysisResponse(analysisText);

    if (!analysis) {
      console.error("Não foi possível processar a resposta da análise.", analysisText);
      return NextResponse.json(
        {
          error:
            "Não foi possível processar a resposta da análise. Tente novamente.",
        },
        { status: 500 }
      );
    }

    // Mapear opções para incluir ícones e cores
    const optionsWithMeta = analysis.options.map((opt) => {
      const meta: Record<
        string,
        { icon: string; label: string; color: string }
      > = {
        rendaFixa: {
          icon: "💳",
          label: "Renda Fixa",
          color: "#3B82F6",
        },
        rendaVariavel: {
          icon: "📊",
          label: "Renda Variável",
          color: "#A855F7",
        },
        tesouroDireto: {
          icon: "🏛️",
          label: "Tesouro Direto",
          color: "#10B981",
        },
        bitcoin: {
          icon: "₿",
          label: "Bitcoin",
          color: "#F59E0B",
        },
      };

      return {
        ...opt,
        ...meta[opt.type],
      };
    });

    return NextResponse.json({
      summary: analysis.summary,
      options: optionsWithMeta,
      marketContext: {
        btcPrice: marketData.btcPrice,
        sentiment: marketData.sentiment,
        headlines: marketData.headlines,
      },
    });
  } catch (error) {
    console.error("Erro na API de investimentos:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro desconhecido no servidor",
      },
      { status: 500 }
    );
  }
}



// fallback mechanism: if OpenAI returns 429 or 5xx, retry with gpt-3.5-turbo
async function callOpenAI(apiKey: string, payload: any) {
  const url = "https://api.openai.com/v1/chat/completions";
  let res = await fetch(url, payload);
  if (res.ok) return res;
  const status = res.status;
  const text = await res.text();
  console.error(`OpenAI response status: ${status}`, text);
  if ((status === 429 || (status >= 500 && status < 600)) && payload.body) {
    // try fallback
    const fallback = JSON.parse(payload.body);
    fallback.model = "gpt-3.5-turbo";
    const newPayload = {
      method: payload.method,
      headers: payload.headers,
      body: JSON.stringify(fallback),
    };
    const res2 = await fetch(url, newPayload);
    return res2;
  }
  return res;
}

