const BRAPI_TOKEN = process.env.NEXT_PUBLIC_BRAPI_TOKEN;
const BASE = "https://brapi.dev/api";

// ─── Listas de ativos monitorados ────────────────────────────────────────────
const ACOES_TICKERS = [
  "PETR4","VALE3","ITUB4","BBDC4","WEGE3",
  "RENT3","RADL3","EGIE3","TAEE11","BBAS3",
  "SUZB3","LREN3","HAPV3","RAIL3","KLBN11",
];

const FIIS_TICKERS = [
  "MXRF11","HGLG11","XPML11","VISC11","KNRI11",
  "BCFF11","RBRF11","HGRE11","VRTA11","CPTS11",
];

const CRYPTO_COINS = [
  "BTC","ETH","BNB","SOL","ADA",
  "XRP","AVAX","DOT","MATIC","LINK",
];

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type TipoInvestimento = "acoes" | "fiis" | "crypto";

export interface RadarItem {
  ticker: string;
  nome: string;
  preco: number;
  variacao: number;         // % no dia
  score: number;            // 0–100
  dyAnual?: number;         // Dividend Yield %
  pl?: number;              // P/L (ações)
  pvp?: number;             // P/VP (FIIs)
  volume: number;
  logoUrl?: string;
  destaque: string;         // motivo principal de recomendação
}

// ─── Score: Ações ─────────────────────────────────────────────────────────────
function scoreAcao(q: any): number {
  let score = 50;

  const dy = q.dividendYield ?? 0;
  const pl = q.priceEarnings ?? 999;
  const varDay = q.regularMarketChangePercent ?? 0;
  const vol = q.regularMarketVolume ?? 0;

  // DY alto é positivo (até +20pts)
  if (dy >= 6) score += 20;
  else if (dy >= 4) score += 12;
  else if (dy >= 2) score += 6;

  // P/L saudável (até +20pts) — ideal entre 8 e 20
  if (pl > 0 && pl <= 12) score += 20;
  else if (pl > 0 && pl <= 20) score += 12;
  else if (pl > 20 || pl <= 0) score -= 10;

  // Variação positiva no dia (até +15pts)
  if (varDay >= 2) score += 15;
  else if (varDay >= 0.5) score += 8;
  else if (varDay < -3) score -= 15;
  else if (varDay < -1) score -= 7;

  // Volume alto = liquidez (até +10pts)
  if (vol >= 10_000_000) score += 10;
  else if (vol >= 3_000_000) score += 5;

  return Math.min(100, Math.max(0, score));
}

// ─── Score: FIIs ──────────────────────────────────────────────────────────────
function scoreFii(q: any): number {
  let score = 50;

  const dy = q.dividendYield ?? 0;
  const pvp = q.priceToBook ?? 999;
  const varDay = q.regularMarketChangePercent ?? 0;
  const vol = q.regularMarketVolume ?? 0;

  // DY alto = bom rendimento mensal (até +25pts)
  if (dy >= 9) score += 25;
  else if (dy >= 7) score += 16;
  else if (dy >= 5) score += 8;

  // P/VP próximo de 1 = preço justo (até +20pts)
  if (pvp >= 0.85 && pvp <= 1.05) score += 20;
  else if (pvp > 1.05 && pvp <= 1.2) score += 8;
  else if (pvp > 1.2) score -= 10;
  else if (pvp < 0.85) score += 12; // desconto

  // Variação do dia (até +10pts)
  if (varDay >= 1) score += 10;
  else if (varDay >= 0) score += 4;
  else if (varDay < -2) score -= 10;

  // Volume (até +5pts)
  if (vol >= 2_000_000) score += 5;

  return Math.min(100, Math.max(0, score));
}

// ─── Score: Crypto ────────────────────────────────────────────────────────────
function scoreCrypto(c: any): number {
  let score = 50;

  const varDay = c.regularMarketChangePercent ?? 0;
  const vol = c.regularMarketVolume ?? 0;
  const varSemana = c.fiftyTwoWeekLow && c.regularMarketPrice
    ? ((c.regularMarketPrice - c.fiftyTwoWeekLow) / c.fiftyTwoWeekLow) * 100
    : 0;

  // Alta no dia (até +25pts)
  if (varDay >= 5) score += 25;
  else if (varDay >= 2) score += 15;
  else if (varDay >= 0.5) score += 8;
  else if (varDay < -5) score -= 20;
  else if (varDay < -2) score -= 10;

  // Afastamento da mínima de 52 semanas (até +15pts) — próximo da mínima = oportunidade
  if (varSemana <= 15) score += 15;
  else if (varSemana <= 30) score += 8;

  // Volume alto (até +10pts)
  if (vol >= 500_000_000) score += 10;
  else if (vol >= 100_000_000) score += 5;

  return Math.min(100, Math.max(0, score));
}

// ─── Gerar motivo do destaque ─────────────────────────────────────────────────
function gerarDestaque(tipo: TipoInvestimento, q: any): string {
  if (tipo === "acoes") {
    const dy = q.dividendYield ?? 0;
    const pl = q.priceEarnings ?? 0;
    if (dy >= 6) return `DY atrativo de ${dy.toFixed(1)}%`;
    if (pl > 0 && pl <= 12) return `P/L baixo (${pl.toFixed(1)}) — preço descontado`;
    if ((q.regularMarketChangePercent ?? 0) >= 2)
      return `Alta de ${q.regularMarketChangePercent.toFixed(2)}% hoje`;
    return "Boa liquidez e fundamentos sólidos";
  }
  if (tipo === "fiis") {
    const dy = q.dividendYield ?? 0;
    const pvp = q.priceToBook ?? 0;
    if (dy >= 9) return `DY elevado de ${dy.toFixed(1)}% ao ano`;
    if (pvp > 0 && pvp < 0.95) return `Negociado abaixo do valor patrimonial (P/VP ${pvp.toFixed(2)})`;
    return `DY de ${dy.toFixed(1)}% com P/VP equilibrado`;
  }
  // crypto
  const varDay = q.regularMarketChangePercent ?? 0;
  if (varDay >= 5) return `Alta expressiva de ${varDay.toFixed(2)}% no dia`;
  if (varDay < 0) return "Correção pode ser oportunidade de entrada";
  return "Volume e liquidez elevados";
}

// ─── Fetch Ações / FIIs ───────────────────────────────────────────────────────
async function fetchAcoesOuFiis(
  tickers: string[],
  tipo: TipoInvestimento
): Promise<RadarItem[]> {
  const symbols = tickers.join(",");
  const url = `${BASE}/quote/${symbols}?token=${BRAPI_TOKEN}&modules=dividendsData`;

  const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5min
  if (!res.ok) throw new Error("Erro ao buscar dados da Brapi");

  const data = await res.json();
  const results: any[] = data.results ?? [];

  return results
    .map((q) => {
      const score = tipo === "acoes" ? scoreAcao(q) : scoreFii(q);
      return {
        ticker: q.symbol,
        nome: q.shortName ?? q.symbol,
        preco: q.regularMarketPrice ?? 0,
        variacao: q.regularMarketChangePercent ?? 0,
        score,
        dyAnual: q.dividendYield ?? undefined,
        pl: tipo === "acoes" ? (q.priceEarnings ?? undefined) : undefined,
        pvp: tipo === "fiis" ? (q.priceToBook ?? undefined) : undefined,
        volume: q.regularMarketVolume ?? 0,
        logoUrl: q.logourl ?? undefined,
        destaque: gerarDestaque(tipo, q),
      } as RadarItem;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

// ─── Fetch Crypto ─────────────────────────────────────────────────────────────
async function fetchCrypto(): Promise<RadarItem[]> {
  const coins = CRYPTO_COINS.join(",");
  const url = `${BASE}/v2/crypto?coin=${coins}&currency=BRL&token=${BRAPI_TOKEN}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Erro ao buscar crypto da Brapi");

  const data = await res.json();
  const results: any[] = data.coins ?? [];

  return results
    .map((c) => {
      const score = scoreCrypto(c);
      return {
        ticker: c.coin,
        nome: c.coinName ?? c.coin,
        preco: c.regularMarketPrice ?? 0,
        variacao: c.regularMarketChangePercent ?? 0,
        score,
        volume: c.regularMarketVolume ?? 0,
        logoUrl: c.coinImageUrl ?? undefined,
        destaque: gerarDestaque("crypto", c),
      } as RadarItem;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

// ─── Export principal ─────────────────────────────────────────────────────────
export async function getRadarOportunidades(
  tipo: TipoInvestimento
): Promise<RadarItem[]> {
  switch (tipo) {
    case "acoes":
      return fetchAcoesOuFiis(ACOES_TICKERS, "acoes");
    case "fiis":
      return fetchAcoesOuFiis(FIIS_TICKERS, "fiis");
    case "crypto":
      return fetchCrypto();
  }
}
