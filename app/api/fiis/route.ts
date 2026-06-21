import { NextResponse } from "next/server";

const FIIS_TICKERS = [
  "MXRF11", "HGLG11", "KNRI11", "XPML11", "VISC11",
  "BCFF11", "HGRE11", "VRTA11", "RBRF11", "BTLG11",
];

const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export async function GET() {
  try {
    const results = await Promise.all(
      FIIS_TICKERS.map(async (ticker) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA?interval=1d&range=1d`,
            {
              next: { revalidate: 60 },
              headers: YAHOO_HEADERS,
            }
          );

          if (!res.ok) {
            console.warn(`⚠️ [fiis] ${ticker} retornou ${res.status}`);
            return { ticker, nome: ticker, preco: 0, variacao: 0, volume: 0, maxDia: 0, minDia: 0 };
          }

          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;

          return {
            ticker,
            nome: meta?.longName ?? ticker,
            preco: meta?.regularMarketPrice ?? 0,
            variacao: meta?.regularMarketChangePercent ?? 0,
            volume: meta?.regularMarketVolume ?? 0,
            maxDia: meta?.regularMarketDayHigh ?? 0,
            minDia: meta?.regularMarketDayLow ?? 0,
          };
        } catch (err) {
          console.error(`❌ [fiis] Erro no ticker ${ticker}:`, err);
          return { ticker, nome: ticker, preco: 0, variacao: 0, volume: 0, maxDia: 0, minDia: 0 };
        }
      })
    );

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("❌ [fiis] Erro geral:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
