// app/api/passkey/auth/start/route.ts
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { userId } = await req.json()

  // Busca as credenciais registradas do usuário
  const { data: passkeys } = await supabaseAdmin
    .from('user_passkeys')
    .select('credential_id')
    .eq('user_id', userId)

  const options = await generateAuthenticationOptions({
    rpID: process.env.NEXT_PUBLIC_APP_DOMAIN!,
    userVerification: 'required',
   allowCredentials: (passkeys ?? []).map((p: { credential_id: string }) => ({
  id: p.credential_id,
  type: 'public-key' as const,
})),


  })

  await supabaseAdmin
    .from('passkey_challenges')
    .upsert({ user_id: userId, challenge: options.challenge })

  return Response.json(options)
}
