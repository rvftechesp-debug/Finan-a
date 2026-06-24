'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TwoFactorLoginModal from './TwoFactorLoginModal'

interface Props {
  access_token: string
  refresh_token: string
}

export default function TwoFactorLogin({ access_token, refresh_token }: Props) {
  const router = useRouter()

  return (
    <TwoFactorLoginModal
      access_token={access_token}
      refresh_token={refresh_token}
      onSuccess={() => router.push('/dashboard')}
      onCancel={() => router.push('/login')}
    />
  )
}
