// lib/passkey/authenticate.ts
import { startAuthentication } from '@simplewebauthn/browser'
import { supabase } from '@/lib/supabase'

export async function loginWithPasskey(userId: string) {
  

  // 1. Pede o desafio de autenticação
  const resp = await fetch('/api/passkey/auth/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  const options = await resp.json()

  // 2. Prompt de biometria
  let credential
  try {
    credential = await startAuthentication(options)
  } catch (err) {
    console.error('Autenticação cancelada:', err)
    throw err
  }

  // 3. Backend valida e retorna token do Supabase
  const verifyResp = await fetch('/api/passkey/auth/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, credential }),
  })

  const result = await verifyResp.json()
  if (!result.verified) throw new Error('Falha na autenticação')

  // 4. Seta a sessão no Supabase com o token retornado pelo backend
  const { error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  })

  if (error) throw error
  return result
}
