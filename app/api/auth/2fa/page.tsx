'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function Admin2FAPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const access_token = sessionStorage.getItem('pending_access_token')
    const refresh_token = sessionStorage.getItem('pending_refresh_token')

    if (!access_token || !refresh_token) {
      setError('Sessão expirada. Faça login novamente.')
      router.push('/login')
      return
    }

    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, access_token, refresh_token }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Código inválido')
      setLoading(false)
      return
    }

    // Restaura sessão após 2FA aprovado
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })

    sessionStorage.removeItem('pending_access_token')
    sessionStorage.removeItem('pending_refresh_token')

    router.push('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0a08]">
      <form onSubmit={handleVerify} className="bg-[#16120e] border border-orange-500/30 rounded-2xl p-8 w-full max-w-sm space-y-4">
        <h1 className="text-orange-300 text-xl font-bold">🔐 Verificação 2FA</h1>
        <p className="text-gray-500 text-sm">Digite o código do seu autenticador para acessar o painel admin.</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="text"
          placeholder="Código de 6 dígitos"
          value={code}
          onChange={e => setCode(e.target.value)}
          maxLength={6}
          className="w-full bg-[#1e1a14] border border-orange-500/30 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-orange-400 tracking-widest text-center text-lg"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-orange-500 text-[#1a1208] font-bold rounded-xl hover:bg-orange-400 transition-all disabled:opacity-50"
        >
          {loading ? 'Verificando...' : 'Confirmar'}
        </button>
      </form>
    </div>
  )
}
