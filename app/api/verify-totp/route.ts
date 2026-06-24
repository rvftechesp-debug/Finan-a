import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyTotpCode } from "@/lib/totp";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { userId, totpCode } = await req.json();

    if (!userId || !totpCode) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(totpCode)) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select("totp_secret")
      .eq("id", userId)
      .maybeSingle(); // ✅ corrigido

    if (error || !profile?.totp_secret) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    const valid = verifyTotpCode(profile.totp_secret, totpCode);
    if (!valid) {
      return NextResponse.json({ error: "Código inválido ou expirado" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
