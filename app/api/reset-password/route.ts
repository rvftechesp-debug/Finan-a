import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifyTotpCode } from "@/lib/totp";
import { getProfile } from "@/lib/supabaseProfile";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // variável secreta no Vercel
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId, newPassword, totpCode } = await req.json();

    if (!userId || !newPassword || !totpCode) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Valida TOTP no servidor
    const profile = await getProfile(userId);
    if (!profile?.totp_secret) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    const valid = verifyTotpCode(profile.totp_secret, totpCode);
    if (!valid) {
      return NextResponse.json({ error: "Código 2FA inválido" }, { status: 401 });
    }

    // Troca a senha via service_role
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
