// Utility functions para análises de investimentos

export async function getMarketData() {
  try {
    const brapiKey = process.env.BRAPI_API_KEY;
    const brapiBase = process.env.BRAPI_BASE_URL || "https://brapi.dev";

    let btcPrice = 0;
    let btcChange = 0;

    // Se houver BRAPI configurada, tentar obter via BRAPI (padrões comuns)
    if (brapiKey) {
      try {
        const tryUrls = [
          `${brapiBase}/api/crypto?coin=BTC`,
          `${brapiBase}/api/crypto/BTC`,
          `${brapiBase}/api/quote/BTC`,
          `${brapiBase}/api/quote/BTC?apikey=${brapiKey}`,
          `${brapiBase}/api/quote/BTC?token=${brapiKey}`,
        ];

        let brRes = null;
        for (const url of tryUrls) {
          brRes = await fetch(url, {
            headers: { Authorization: `Bearer ${brapiKey}`, Accept: "application/json" },
          }).catch(() => null);
          if (brRes && brRes.ok) break;
        }

        if (brRes && brRes.ok) {
          const brData = await brRes.json();
          // Tentar extrair price / change de formatos comuns
          btcPrice =
            Number(brData?.price) ||
            Number(brData?.results?.[0]?.price) ||
            Number(brData?.results?.[0]?.close) ||
            Number(brData?.results?.[0]?.last) ||
            Number(brData?.close) ||
            0;
          btcChange =
            Number(brData?.results?.[0]?.percent_change_24h) ||
            Number(brData?.change) ||
            Number(brData?.price_change_percentage_24h) ||
            0;
        }
      } catch (err) {
        console.error("Erro ao buscar via BRAPI:", err);
      }
    }

    // Fallback para CoinGecko se BRAPI não estiver disponível ou não trouxe preço
    if (!btcPrice) {
      const btcResponse = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true"
      );
      const btcData = await btcResponse.json();
      btcPrice = btcData.bitcoin?.brl || 0;
      btcChange = btcData.bitcoin?.["brl_24h_change"] || 0;
    }

    // Simular contexto de notícias (pode trocar por provedor de notícias real)
    const headlines = [
      "Banco Central sinaliza possível redução de taxa de juros",
      "Tesouro direto fecha semana em alta",
      "Bitcoin rompe resistência e segue em tendência positiva",
      "Mercado de ações fechou com ganhos para setores de infraestrutura",
    ];

    return {
      btcPrice,
      btcChange,
      headlines,
      date: new Date().toLocaleDateString("pt-BR"),
      sentiment: btcChange > 0 ? "bullish" : btcChange < -1 ? "bearish" : "neutral",
    };
  } catch (error) {
    console.error("Erro ao buscar dados de mercado:", error);
    return {
      btcPrice: 180000,
      btcChange: 0,
      headlines: [],
      date: new Date().toLocaleDateString("pt-BR"),
      sentiment: "neutral",
    };
  }
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getMarketSentimentScore(): number {
  // Retorna score entre -1 e 1
  // -1: muito bearish, 0: neutro, 1: muito bullish
  // Poderia ser obtido de uma análise de sentimento real
  const hour = new Date().getHours();
  return (Math.sin(hour / 24) * 0.5 + Math.random() * 0.2) || 0.1;
}

export function getInvestmentRecommendationPrompt(
  investmentValue: number,
  marketData: Awaited<ReturnType<typeof getMarketData>>
): string {
  const sentiment = marketData.sentiment;
  const newsContext = marketData.headlines.join("\n- ");

  return `Você é um consultor de investimentos financeiro experiente. Analise o seguinte cenário de investimento e forneça recomendações específicas:

VALOR DISPONÍVEL PARA INVESTIMENTO: R$ ${investmentValue.toFixed(2)}

CONTEXTO DE MERCADO ATUAL (${marketData.date}):
- Bitcoin: R$ ${marketData.btcPrice.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} (variação 24h: ${marketData.btcChange > 0 ? "+" : ""}${marketData.btcChange.toFixed(1)}%)
- Sentimento de Mercado: ${sentiment === "bullish" ? "OTIMISTA" : sentiment === "bearish" ? "PESSIMISTA" : "NEUTRO"}
- Principais Notícias:
  - ${newsContext}

IMPORTANTE: Você DEVE responder em JSON válido com a seguinte estrutura EXATA (sem markdown, sem explanação fora do JSON):

{
  "summary": "Resumo executivo da situação em uma frase",
  "options": [
    {
      "type": "rendaFixa",
      "percentage": <número>,
      "justification": "Razão específica para este % baseado no contexto atual",
      "risk": "baixo|médio|alto",
      "expectedReturn": "X% a.a aproximadamente"
    },
    {
      "type": "rendaVariavel",
      "percentage": <número>,
      "justification": "Razão específica",
      "risk": "baixo|médio|alto",
      "expectedReturn": "X% a.a aproximadamente"
    },
    {
      "type": "tesouroDireto",
      "percentage": <número>,
      "justification": "Razão específica",
      "risk": "baixo|médio|alto",
      "expectedReturn": "X% a.a aproximadamente"
    },
    {
      "type": "bitcoin",
      "percentage": <número>,
      "justification": "Razão específica baseada no preço e sentimento atuais",
      "risk": "baixo|médio|alto",
      "expectedReturn": "X% a.a aproximadamente"
    }
  ]
}

A soma dos percentuais DEVE ser 100%.
As justificativas devem ser ESPECÍFICAS e referenciar dados do contexto fornecido.
Seja conciso e prático.`;
}

export interface AnalysisResult {
  summary: string;
  options: Array<{
    type: "rendaFixa" | "rendaVariavel" | "tesouroDireto" | "bitcoin";
    percentage: number;
    justification: string;
    risk: "baixo" | "médio" | "alto";
    expectedReturn: string;
  }>;
}

export function parseAnalysisResponse(response: string): AnalysisResult | null {
  try {
    // Tentar parsear direto
    return JSON.parse(response);
  } catch {
    try {
      // Tentar remover markdown code blocks
      const cleaned = response
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      return JSON.parse(cleaned);
    } catch {
      console.error("Erro ao parsear resposta:", response);
      return null;
    }
  }
}

export function generateRuleBasedAnalysis(
  investmentValue: number,
  marketData: Awaited<ReturnType<typeof getMarketData>>
): AnalysisResult {
  const sentiment = marketData.sentiment;
  const btcChange = Number(marketData.btcChange || 0);

  let base: { rendaFixa: number; rendaVariavel: number; tesouroDireto: number; bitcoin: number };

  if (sentiment === "bullish" || btcChange > 2) {
    base = { rendaFixa: 25, rendaVariavel: 35, tesouroDireto: 20, bitcoin: 20 };
  } else if (sentiment === "bearish" || btcChange < -2) {
    base = { rendaFixa: 60, rendaVariavel: 15, tesouroDireto: 20, bitcoin: 5 };
  } else {
    base = { rendaFixa: 40, rendaVariavel: 25, tesouroDireto: 30, bitcoin: 5 };
  }

  // Ajustes por valor investido
  if (investmentValue < 1000) {
    base.bitcoin = Math.max(0, base.bitcoin - 3);
    base.rendaFixa += 3;
  }
  if (investmentValue > 100000) {
    base.bitcoin += 5;
    base.rendaVariavel += 3;
    base.rendaFixa = Math.max(5, base.rendaFixa - 3);
  }

  // Normalizar para 100% (arredondando)
  const sum = base.rendaFixa + base.rendaVariavel + base.tesouroDireto + base.bitcoin;
  const factor = 100 / sum;
  const alloc = {
    rendaFixa: Math.round(base.rendaFixa * factor),
    rendaVariavel: Math.round(base.rendaVariavel * factor),
    tesouroDireto: Math.round(base.tesouroDireto * factor),
    bitcoin: 0 as number,
  };
  alloc.bitcoin = 100 - (alloc.rendaFixa + alloc.rendaVariavel + alloc.tesouroDireto);

  const headline = (marketData.headlines && marketData.headlines[0]) || "sem notícias relevantes";

  const summary = `Alocação sugerida baseada no contexto de mercado (${marketData.sentiment}).`;

  const options = [
    {
      type: "rendaFixa" as const,
      percentage: alloc.rendaFixa,
      justification: `Priorizar preservação de capital; cenário: ${marketData.sentiment}.`,
      risk: "baixo" as const,
      expectedReturn: "6-12% a.a aproximadamente",
    },
    {
      type: "rendaVariavel" as const,
      percentage: alloc.rendaVariavel,
      justification: `Exposição a ativos com potencial de crescimento; notícia principal: ${headline}`,
      risk: "médio" as const,
      expectedReturn: "10-20% a.a (variável)",
    },
    {
      type: "tesouroDireto" as const,
      percentage: alloc.tesouroDireto,
      justification: "Proteção real e estabilidade via títulos públicos.",
      risk: "baixo" as const,
      expectedReturn: "6-10% a.a aproximadamente",
    },
    {
      type: "bitcoin" as const,
      percentage: alloc.bitcoin,
      justification: `Alocação para potencial de alta; preço atual BTC: R$ ${marketData.btcPrice}. Alta volatilidade.`,
      risk: "alto" as const,
      expectedReturn: "Altamente volátil (sem garantia)",
    },
  ];

  return {
    summary,
    options,
  };
}

