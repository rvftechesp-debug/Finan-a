// components/TwoFactorLoginModal.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { ShieldCheck, AlertTriangle, X, Loader } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

interface Props {
  access_token: string
  refresh_token: string
  onSuccess: () => void
  onCancel: () => void
}

export default function TwoFactorLoginModal({
  access_token,
  refresh_token,
  onSuccess,
  onCancel,
}: Props) {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  function handleChange(value: string, index: number) {
    if (!/^\d?$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    if (value && index < 5) {
      inputs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = pasted.split('')
    while (newCode.length < 6) newCode.push('')
    setCode(newCode)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Digite os 6 dígitos do código.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode, access_token, refresh_token }),
      })

      const result = await res.json()

      if (!res.ok || !result.verified) {
        setError(result.error ?? 'Código inválido ou expirado.')
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      })

      if (sessionError) {
        setError('Erro ao restaurar sessão.')
        return
      }

      onSuccess()
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  } // ← fechamento do handleSubmit que estava faltando

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-[380px]">
        <Card className="bg-[#0d0d1a] border-white/[0.07]">
          <CardContent className="p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-white m-0">
                    Verificação em duas etapas
                  </h2>
                  <p className="text-[#666] text-xs m-0">
                    Digite o código do Google Authenticator
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="text-[#888] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inputs dos 6 dígitos */}
            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
              <div className="flex gap-2" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl
                               border-white/10 bg-white/5 text-white
                               focus:border-orange-500 focus:outline-none
                               transition-colors"
                  />
                ))}
              </div>

              {/* Erro */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 w-full flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-red-400 text-sm m-0">{error}</p>
                </div>
              )}

              {/* Botões */}
              <div className="w-full space-y-2">
                <button
                  type="submit"
                  disabled={loading || code.join('').length !== 6}
                  className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold
                             rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full
                             cursor-pointer flex items-center justify-center gap-2
                             shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <><Loader className="w-4 h-4 animate-spin" /> Verificando...</>
                    : <><ShieldCheck className="w-4 h-4" /> Confirmar</>
                  }
                </button>

                <button
                  type="button"
                  onClick={onCancel}
                  className="bg-white/5 border border-white/10 text-[#ccc] hover:text-white
                             font-bold rounded-xl py-3 text-sm hover:bg-white/10 transition-all
                             w-full cursor-pointer flex items-center justify-center gap-2"
                >
                  Cancelar
                </button>
              </div>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
