// components/AuthGate.tsx
'use client'

import { useEffect, useState } from 'react'
import { isPasskeyAvailable } from '@/lib/passkey/isPasskeyAvailable'
import PasskeyLogin from './PasskeyLogin'
import TwoFactorLogin from './TwoFactorLogin'

interface Props {
  userId: string
  access_token: string
  refresh_token: string
}

export default function AuthGate({ userId, access_token, refresh_token }: Props) {
  const [method, setMethod] = useState<'passkey' | '2fa' | null>(null)

  useEffect(() => {
    isPasskeyAvailable().then((available) => {
      setMethod(available ? 'passkey' : '2fa')
    })
  }, [])

  if (!method) return <p>Carregando...</p>

  return method === 'passkey'
    ? <PasskeyLogin userId={userId} />
    : <TwoFactorLogin access_token={access_token} refresh_token={refresh_token} />
}
