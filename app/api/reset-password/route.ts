import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyTotpCode } from "@/lib/totp"; // sua função existente

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role — nunca expor no client
);

export async function POST(req: NextRequest) {
  try {
    const { username, newPassword, totpCode } = await req.json();

    // Validações básicas
    if (!username || !newPassword || !totpCode) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Senha muito curta" }, { status: 400 });
    }
    if (totpCode.length !== 6) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    // 1. Busca o perfil pelo username (server-side, seguro)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id, totp_secret")
      .eq("username", username.trim().toLowerCase())
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (!profile.totp_secret) {
      return NextResponse.json(
        { error: "Usuário sem 2FA configurado" },
        { status: 400 }
      );
    }

    // 2. Valida o TOTP no servidor (secret nunca sai daqui)
    const valid = verifyTotpCode(profile.totp_secret, totpCode.trim());
    if (!valid) {
      return NextResponse.json({ error: "Código do autenticador inválido" }, { status: 401 });
    }

    // 3. Atualiza a senha via Admin (sem precisar de sessão)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword.trim() }
    );

    if (updateError) {
      return NextResponse.json({ error: "Erro ao atualizar senha" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
