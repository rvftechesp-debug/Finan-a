'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setError(error.message)
    router.push('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0a08]">
      <form onSubmit={handleLogin} className="bg-[#16120e] border border-orange-500/30 rounded-2xl p-8 w-full max-w-sm space-y-4">
        <h1 className="text-orange-300 text-xl font-bold">Login</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full bg-[#1e1a14] border border-orange-500/30 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-orange-400" />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full bg-[#1e1a14] border border-orange-500/30 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-orange-400" />
        <button type="submit" className="w-full py-3 bg-orange-500 text-[#1a1208] font-bold rounded-xl hover:bg-orange-400 transition-all">
          Entrar
        </button>
      </form>
    </div>
  )
}
