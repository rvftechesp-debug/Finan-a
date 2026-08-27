import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.pluggy.ai";

async function getApiKey() {
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });
  const { apiKey } = await res.json();
  return apiKey;
}

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId obrigatório" }, { status: 400 });

  const apiKey = await getApiKey();

  // 1. pega as contas do item
  const accRes = await fetch(`${BASE}/accounts?itemId=${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });
  const { results: accounts } = await accRes.json();

  // 2. pega transações de cada conta
  const all: any[] = [];
  for (const acc of accounts ?? []) {
    const txRes = await fetch(
      `${BASE}/transactions?accountId=${acc.id}&pageSize=200`,
      { headers: { "X-API-KEY": apiKey } }
    );
    const { results } = await txRes.json();
    all.push(...(results ?? []));
  }

  return NextResponse.json({ transactions: all });
}
