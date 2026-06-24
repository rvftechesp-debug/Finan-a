// app/api/passkey/register/start/route.ts
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { userId } = await req.json()

  if (!userId) {
    return Response.json({ error: 'userId obrigatório' }, { status: 400 })
  }

  const options = await generateRegistrationOptions({
    rpName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Meu App', // ✅ via env
    rpID: process.env.NEXT_PUBLIC_APP_DOMAIN!,
    userID: userId,
    userName: userId,
    attestationType: 'none',
    authenticatorSelection: {
      userVerification: 'required',
      residentKey: 'preferred',
    },
  })

  await supabaseAdmin
    .from('passkey_challenges')
    .upsert({ user_id: userId, challenge: options.challenge })

  return Response.json(options)
}
