// app/api/auth/2fa/verify/route.ts
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

function verifyTOTP(secret: string, token: string): boolean {
  const base32Decode = (s: string) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let bits = 0, value = 0
    const output: number[] = []
    for (const char of s.toUpperCase().replace(/=+$/, '')) {
      value = (value << 5) | alphabet.indexOf(char)
      bits += 5
      if (bits >= 8) { bits -= 8; output.push((value >> bits) & 0xff) }
    }
    return Buffer.from(output)
  }

  const counter = Math.floor(Date.now() / 1000 / 30)

  for (const delta of [-1, 0, 1]) {
    const buf = Buffer.alloc(8)
    buf.writeBigInt64BE(BigInt(counter + delta))
    const hmac = createHmac('sha1', base32Decode(secret)).update(buf).digest()
    const offset = hmac[hmac.length - 1] & 0xf
    const otp = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0')
    if (otp === token) return true
  }
  return false
}

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

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return Response.json({ error: 'Usuário não autenticado' }, { status: 401 })
  }

const { data: profile, error: profileError } = await supabase
  .from('users')
  .select('totp_secret')
  .eq('id', user.id)
  .single()

  if (profileError || !profile?.totp_secret) {
    return Response.json({ error: 'Nenhum fator TOTP encontrado' }, { status: 400 })
  }

  const isValid = verifyTOTP(profile.totp_secret, code)

  if (!isValid) {
    return Response.json({ error: 'Código inválido ou expirado' }, { status: 400 })
  }

  return Response.json({
    verified: true,
    access_token,
    refresh_token,
  })
}
