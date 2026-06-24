// lib/passkey/register.ts
import { startRegistration } from '@simplewebauthn/browser'

export async function registerPasskey(userId: string) {
  const resp = await fetch('/api/passkey/register/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })

  if (!resp.ok) throw new Error('Erro ao iniciar registro de passkey')
  const options = await resp.json()

  let credential
  try {
    credential = await startRegistration(options)
  } catch (err) {
    console.error('Registro cancelado ou falhou:', err)
    throw err
  }

  const verifyResp = await fetch('/api/passkey/register/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, credential }),
  })

  // ✅ verifica status HTTP antes de checar o JSON
  if (!verifyResp.ok) {
    const err = await verifyResp.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Falha ao registrar passkey')
  }

  const result = await verifyResp.json()
  if (!result.verified) throw new Error('Falha ao registrar passkey')

  return result
}
