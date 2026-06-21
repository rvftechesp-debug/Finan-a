import { NextResponse } from 'next/server';

const TICKERS: { ticker: string; segmento: string }[] = [
  // Bancos
  { ticker: 'ITUB4', segmento: 'Bancos' },
  { ticker: 'BBDC4', segmento: 'Bancos' },
  { ticker: 'BBAS3', segmento: 'Bancos' },
  // Energia / Petróleo
  { ticker: 'PETR4', segmento: 'Energia / Petróleo' },
  { ticker: 'CSAN3', segmento: 'Energia / Petróleo' },
  { ticker: 'UGPA3', segmento: 'Energia / Petróleo' },
  // Mineração / Siderurgia
  { ticker: 'VALE3', segmento: 'Mineração / Siderurgia' },
  { ticker: 'CSNA3', segmento: 'Mineração / Siderurgia' },
  { ticker: 'GGBR4', segmento: 'Mineração / Siderurgia' },
  // Varejo
  { ticker: 'MGLU3', segmento: 'Varejo' },
  { ticker: 'VIIA3', segmento: 'Varejo' },
  { ticker: 'AMER3', segmento: 'Varejo' },
  // Consumo / Alimentos
  { ticker: 'ABEV3', segmento: 'Consumo / Alimentos' },
  { ticker: 'JBSS3', segmento: 'Consumo / Alimentos' },
  { ticker: 'BRFS3', segmento: 'Consumo / Alimentos' },
  // Construção / Imóveis
  { ticker: 'CYRE3', segmento: 'Construção / Imóveis' },
  { ticker: 'MRVE3', segmento: 'Construção / Imóveis' },
  { ticker: 'EZTC3', segmento: 'Construção / Imóveis' },
  // Energia Elétrica
  { ticker: 'EGIE3', segmento: 'Energia Elétrica' },
  { ticker: 'CPFE3', segmento: 'Energia Elétrica' },
  { ticker: 'TAEE11', segmento: 'Energia Elétrica' },
  // Tecnologia / Telecom
  { ticker: 'TOTS3', segmento: 'Tecnologia / Telecom' },
  { ticker: 'VIVT3', segmento: 'Tecnologia / Telecom' },
  { ticker: 'TIMS3', segmento: 'Tecnologia / Telecom' },
];

const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

export async function GET() {
  try {
    const results = await Promise.all(
      TICKERS.map(async ({ ticker, segmento }) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA?interval=1d&range=1d`,
            {
              next: { revalidate: 300 },
              headers: YAHOO_HEADERS,
            }
          );

          if (!res.ok) {
            console.warn(`⚠️ [acoes] ${ticker} retornou ${res.status}`);
            return { ticker, segmento, nome: ticker, preco: null, variacao: null, maxDia: null, minDia: null, volume: null, moeda: 'BRL' };
          }

          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;

          return {
            ticker,
            segmento,
            nome: meta?.longName ?? ticker,
            preco: meta?.regularMarketPrice ?? null,
            variacao: meta?.regularMarketChangePercent ?? null,
            maxDia: meta?.regularMarketDayHigh ?? null,
            minDia: meta?.regularMarketDayLow ?? null,
            volume: meta?.regularMarketVolume ?? null,
            moeda: meta?.currency ?? 'BRL',
          };
        } catch (err) {
          console.error(`❌ [acoes] Erro no ticker ${ticker}:`, err);
          return { ticker, segmento, nome: ticker, preco: null, variacao: null, maxDia: null, minDia: null, volume: null, moeda: 'BRL' };
        }
      })
    );

    // ✅ Retorna array direto (não { data: results })
    return NextResponse.json(results);
  } catch (error) {
    console.error('❌ [acoes] Erro geral:', error);
    return NextResponse.json({ error: 'Erro ao buscar ações' }, { status: 500 });
  }
}
