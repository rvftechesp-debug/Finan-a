// app/api/crypto/route.ts
import { NextResponse } from "next/server";

const CRYPTO_IDS = [
  "bitcoin", "ethereum", "solana", "ripple", "binancecoin",
  "cardano", "dogecoin", "avalanche-2", "polkadot", "matic-network",
];

export async function GET() {
  try {
    const ids = CRYPTO_IDS.join(",");
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&ids=${ids}&order=market_cap_desc`;

    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`coingecko: ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Formato inesperado da API");

    const mapped = data.map((item: any) => ({
      symbol: item.symbol?.toUpperCase() ?? "",
      nome: item.name ?? "",
      preco: item.current_price ?? 0,
      variacao: item.price_change_percentage_24h ?? 0,
      maxDia: item.high_24h ?? 0,
      minDia: item.low_24h ?? 0,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
