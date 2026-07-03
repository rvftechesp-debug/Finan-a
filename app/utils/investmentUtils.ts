export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function getMarketData() {
  try {
    const brapiKey = process.env.BRAPI_API_KEY;
    const brapiBase = process.env.BRAPI_BASE_URL || "https://brapi.dev";

    let btcPrice = 0;
    let btcChange = 0;

    if (brapiKey) {
      try {
        const url = `${brapiBase}/api/v2/crypto?coin=BTC&currency=BRL&token=${brapiKey}`;
        const brRes = await fetch(url, { headers: { Accept: "application/json" } });

        if (brRes.ok) {
          const brData = await brRes.json();
          const coin = brData?.coins?.[0];
          btcPrice = Number(coin?.regularMarketPrice) || 0;
          btcChange = Number(coin?.regularMarketChangePercent) || 0;
        }
      } catch (err) {
        console.error("Erro ao buscar via BRAPI:", err);
      }
    }

    // Fallback CoinGecko
    if (!btcPrice) {
      const btcResponse = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true"
      );
      const btcData = await btcResponse.json();
      btcPrice = btcData.bitcoin?.brl || 0;
      btcChange = btcData.bitcoin?.["brl_24h_change"] || 0;
    }

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

export function getInvestmentRecommendationPrompt(
  value: number,
  marketData: Awaited<ReturnType<typeof getMarketData>>
): string {
  return `
Você é um consultor financeiro brasileiro experiente. Analise o perfil de investimento abaixo e forneça recomendações personalizadas.

DADOS DO INVESTIDOR:
- Valor disponível para investir: R$ ${value.toFixed(2)}
- Data da análise: ${marketData.date}

CONTEXTO DE MERCADO ATUAL:
- Bitcoin (BRL): R$ ${marketData.btcPrice.toLocaleString("pt-BR")} (${marketData.btcChange.toFixed(2)}% 24h)
- Sentimento do mercado: ${marketData.sentiment}
- Manchetes recentes: ${marketData.headlines.join("; ")}

Responda EXATAMENTE neste formato JSON (sem markdown, sem explicações fora do JSON):
{
  "summary": "resumo geral da recomendação em 2-3 frases",
  "options": [
    {
      "type": "rendaFixa",
      "title": "Renda Fixa",
      "description": "descrição breve",
      "allocation": 40,
      "amount": ${(value * 40) / 100},
      "risk": "baixo",
      "return": "estimativa de retorno"
    }
  ]
}

Tipos válidos: rendaFixa, rendaVariavel, tesouroDireto, bitcoin.
O campo "amount" DEVE ser calculado como: (allocation / 100) * ${value.toFixed(2)}.
A soma das allocations deve ser 100.
`.trim();
}

// ✅ Agora recebe value e marketData para usar no fallback
export function parseAnalysisResponse(
  text: string,
  value: number,
  marketData: Awaited<ReturnType<typeof getMarketData>>
): {
  summary: string;
  options: {
    type: string;
    title: string;
    description: string;
    allocation: number;
    amount: number;
    risk: string;
    return: string;
  }[];
} {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return generateRuleBasedAnalysis(value, marketData); // ✅ usa valores reais
  }
}

export function generateRuleBasedAnalysis(
  value: number,
  marketData: Awaited<ReturnType<typeof getMarketData>>
) {
  const sentiment = marketData.sentiment;
  const btcFormatted = marketData.btcPrice.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const mainHeadline = marketData.headlines?.[0] ?? "Mercado em observação";

  const allocations =
    sentiment === "bullish"
      ? { rendaFixa: 30, tesouroDireto: 20, rendaVariavel: 35, bitcoin: 15 }
      : sentiment === "bearish"
      ? { rendaFixa: 50, tesouroDireto: 30, rendaVariavel: 15, bitcoin: 5 }
      : { rendaFixa: 40, tesouroDireto: 25, rendaVariavel: 25, bitcoin: 10 };

  const sentimentLabel =
    sentiment === "bullish" ? "otimista" : sentiment === "bearish" ? "pessimista" : "neutro";

  const options = [
    {
      type: "rendaFixa",
      title: "Renda Fixa",
      description: `Priorizar preservação de capital; cenário: ${sentimentLabel}.`,
      allocation: allocations.rendaFixa,
      amount: (value * allocations.rendaFixa) / 100,
      risk: "baixo",
      return: "6-12% a.a aproximadamente",
    },
    {
      type: "rendaVariavel",
      title: "Renda Variável",
      description: `Exposição a ativos com potencial de crescimento; notícia principal: ${mainHeadline}`,
      allocation: allocations.rendaVariavel,
      amount: (value * allocations.rendaVariavel) / 100,
      risk: "médio",
      return: "10-20% a.a (variável)",
    },
    {
      type: "tesouroDireto",
      title: "Tesouro Direto",
      description: "Proteção real e estabilidade via títulos públicos.",
      allocation: allocations.tesouroDireto,
      amount: (value * allocations.tesouroDireto) / 100,
      risk: "baixo",
      return: "6-10% a.a aproximadamente",
    },
    {
      type: "bitcoin",
      title: "Bitcoin",
      description: `Alocação para potencial de alta; preço atual BTC: ${btcFormatted}. Alta volatilidade.`,
      allocation: allocations.bitcoin,
      amount: (value * allocations.bitcoin) / 100,
      risk: "alto",
      return: "Altamente volátil (sem garantia)",
    },
  ];

  return {
    summary: `Alocação sugerida com base no contexto de mercado (${sentiment}).`,
    options,
  };
}
