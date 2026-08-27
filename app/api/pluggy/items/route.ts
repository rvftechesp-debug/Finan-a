import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );
}

// POST — salva conexão
export async function POST(req: NextRequest) {
  const { itemId } = await req.json();
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // busca nome do connector na Pluggy
  const apiKey = await getApiKey();
  const itemRes = await fetch(`${BASE}/items/${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });
  const item = await itemRes.json();

  const { error } = await supabase.from("pluggy_items").upsert(
    {
      user_id: user.id,
      item_id: itemId,
      connector_name: item?.connector?.name ?? null,
      status: item?.status ?? "UPDATING",
    },
    { onConflict: "user_id,item_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET — lista conexões do usuário
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("pluggy_items")
    .select("*")
    .eq("user_id", user.id);

  return NextResponse.json({ items: data ?? [] });
}
