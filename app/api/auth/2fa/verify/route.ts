// app/api/auth/2fa/verify/route.ts
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  let body: { code: string; access_token: string; refresh_token: string }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { code, access_token, refresh_token } = body

  if (!code || !access_token || !refresh_token) {
    return Response.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  await supabase.auth.setSession({ access_token, refresh_token })

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()

  if (factorsError || !factorsData?.totp?.length) {
    return Response.json({ error: 'Nenhum fator TOTP encontrado' }, { status: 400 })
  }

  const totpFactor = factorsData.totp[0]

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  })

  if (challengeError || !challengeData) {
    return Response.json({ error: 'Erro ao criar challenge' }, { status: 500 })
  }

  const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challengeData.id,
    code,
  })

  if (verifyError || !verifyData) {
    return Response.json({ error: 'Código inválido ou expirado' }, { status: 400 })
  }

  // ✅ Usa verifyData diretamente, sem chamar getSession()
  return Response.json({
    verified: true,
    access_token: verifyData.access_token,
    refresh_token: verifyData.refresh_token,
  })
}
