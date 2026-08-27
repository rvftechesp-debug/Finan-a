import { NextResponse } from "next/server";

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
  if (!res.ok) throw new Error("Falha ao autenticar na Pluggy");
  const { apiKey } = await res.json();
  return apiKey;
}

export async function POST() {
  try {
    const apiKey = await getApiKey();
    const res = await fetch(`${BASE}/connect_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({}), // pode passar options aqui
    });
    const { accessToken } = await res.json();
    return NextResponse.json({ accessToken });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
