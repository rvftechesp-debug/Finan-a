import * as OTPAuth from "otpauth"
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { code, access_token, refresh_token } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    await supabase.auth.setSession({ access_token, refresh_token })
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('users')
      .select('totp_secret')
      .eq('id', user!.id)
      .maybeSingle()

    if (!profile?.totp_secret) {
      return Response.json({ error: '2FA não configurado' }, { status: 404 })
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'RV Finança', label: 'rvfinanca',
      algorithm: 'SHA1', digits: 6, period: 30,
      secret: OTPAuth.Secret.fromBase32(profile.totp_secret),
    })

    if (totp.validate({ token: code, window: 2 }) === null) {
      return Response.json({ error: 'Código inválido ou expirado' }, { status: 401 })
    }
    return Response.json({ verified: true, access_token, refresh_token })
  } catch (e: any) {
    console.error('[2FA] erro:', e)
    return Response.json({ error: e?.message }, { status: 500 })
  }
}
