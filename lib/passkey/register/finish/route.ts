// app/api/passkey/register/finish/route.ts
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { userId, credential } = await req.json()

  // ✅ era "onst" — typo crítico
  const { data: challengeRow } = await supabaseAdmin
    .from('passkey_challenges')
    .select('challenge')
    .eq('user_id', userId)
    .maybeSingle()

  if (!challengeRow?.challenge) {
    return Response.json({ error: 'Challenge não encontrado' }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: process.env.NEXT_PUBLIC_APP_URL!,
      expectedRPID: process.env.NEXT_PUBLIC_APP_DOMAIN!,
    })
  } catch (err) {
    console.error('Erro na verificação:', err)
    return Response.json({ error: String(err) }, { status: 400 })
  }

  if (!verification.verified || !verification.registrationInfo) {
    return Response.json({ verified: false }, { status: 400 })
  }

  // ✅ indentação corrigida + try/catch no insert
  const { error: insertError } = await supabaseAdmin
    .from('user_passkeys')
    .insert({
      user_id: userId,
      credential_id: verification.registrationInfo.credential.id,
      public_key: Buffer.from(
        verification.registrationInfo.credential.publicKey
      ).toString('base64'),
      counter: verification.registrationInfo.credential.counter,
    })

  if (insertError) {
    console.error('Erro ao salvar passkey:', insertError)
    return Response.json({ error: 'Erro ao salvar passkey' }, { status: 500 })
  }

  // ✅ limpa o challenge após uso
  await supabaseAdmin
    .from('passkey_challenges')
    .delete()
    .eq('user_id', userId)

  return Response.json({ verified: true })
}
