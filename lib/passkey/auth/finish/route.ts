// lib/passkey/auth/finish/route.ts
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { userId, credential } = await req.json()

  // Busca o challenge
  // challenge:
const { data: challengeRow } = await supabaseAdmin
  .from('passkey_challenges')
  .select('challenge')
  .eq('user_id', userId)
  .maybeSingle() // ✅

if (!challengeRow?.challenge) {
  return Response.json({ error: 'Challenge não encontrado' }, { status: 400 })
}

// passkey:
const { data: passkey } = await supabaseAdmin
  .from('user_passkeys')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle() // ✅

if (!passkey) {
  return Response.json({ error: 'Passkey não encontrada' }, { status: 400 })
}

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: process.env.NEXT_PUBLIC_APP_URL!,
      expectedRPID: process.env.NEXT_PUBLIC_APP_DOMAIN!,
      credential: {
        id: passkey.credential_id,
        publicKey: new Uint8Array(Buffer.from(passkey.public_key, 'base64')),
        counter: passkey.counter,
        transports: passkey.transports ?? undefined,
      },
    })
  } catch (err) {
    console.error('Erro na verificação:', err)
    return Response.json({ error: String(err) }, { status: 400 })
  }

  if (!verification.verified) {
    return Response.json({ verified: false }, { status: 400 })
  }

  // Atualiza o counter
  await supabaseAdmin
    .from('user_passkeys')
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq('user_id', userId)

  // Busca o email do usuário
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

  if (userError || !userData?.user?.email) {
    return Response.json({ error: 'Usuário não encontrado' }, { status: 500 })
  }

  // Gera o magic link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    return Response.json({ error: 'Erro ao gerar link' }, { status: 500 })
  }

  // Troca o hashed_token por uma sessão real (access_token + refresh_token)
  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
    email: userData.user.email,
    token: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (sessionError || !sessionData?.session) {
    return Response.json({ error: 'Erro ao criar sessão' }, { status: 500 })
  }

  return Response.json({
    verified: true,
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  })
} // <-- essa chave estava faltando
