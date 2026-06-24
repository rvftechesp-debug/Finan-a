'use client'

import { useRouter } from 'next/navigation'
import PasskeyLoginModal from './PasskeyLoginModal'

interface Props {
  userId: string
}

export default function PasskeyLogin({ userId }: Props) {
  const router = useRouter()

  return (
    <PasskeyLoginModal
      userId={userId}
      onSuccess={() => router.push('/dashboard')}
      onCancel={() => router.push('/login')}
    />
  )
}
