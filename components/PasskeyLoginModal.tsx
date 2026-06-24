// components/PasskeyLoginModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { supabase } from '@/lib/supabase'
import { Fingerprint, ScanFace, X, AlertTriangle, Loader } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  userId: string
  onSuccess: () => void
  onCancel: () => void
}

export default function PasskeyLoginModal({ userId, onSuccess, onCancel }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuthenticate = async () => {
    setError('')
    setLoading(true)
    try {
      // 1. Pede o desafio ao backend
      const resp = await fetch('/api/passkey/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const options = await resp.json()

      // 2. Abre o prompt de biometria/passkey no browser
      const credential = await startAuthentication(options)

      // 3. Valida no backend
      const verifyResp = await fetch('/api/passkey/auth/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, credential }),
      })
      const result = await verifyResp.json()

      if (!result.verified) {
        setError('Falha na verificação. Tente novamente.')
        return
      }

      // 4. Restaura a sessão Supabase com os tokens retornados
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      })

      if (sessionError) {
        setError('Erro ao restaurar sessão. Tente novamente.')
        return
      }

      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('cancelled') || msg.includes('NotAllowedError')) {
        setError('Autenticação cancelada pelo usuário.')
      } else {
        setError('Erro ao autenticar. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Dispara automaticamente ao abrir o modal
  useEffect(() => {
    handleAuthenticate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-[380px]">
        <Card className="bg-[#0d0d1a] border-white/[0.07]">
          <CardContent className="p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center">
                  <ScanFace className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-white m-0">
                    Verificação Biométrica
                  </h2>
                  <p className="text-[#666] text-xs m-0">
                    Use sua biometria ou passkey
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

            {/* Ícones */}
            <div className="flex items-center justify-center gap-4 my-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Fingerprint className="w-7 h-7 text-blue-400" />
                </div>
                <span className="text-xs text-[#666]">Biometria</span>
              </div>
              <span className="text-[#444] text-sm">ou</span>
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <ScanFace className="w-7 h-7 text-purple-400" />
                </div>
                <span className="text-xs text-[#666]">Face ID</span>
              </div>
            </div>

            {/* Status */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-2 mb-4">
                <Loader className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="text-[#888] text-sm">
                  Aguardando verificação...
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-red-400 text-sm m-0">{error}</p>
              </div>
            )}

            {/* Botões */}
            <div className="space-y-2">
              {(error || !loading) && (
                <button
                  onClick={handleAuthenticate}
                  disabled={loading}
                  className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading
                    ? <Loader className="w-4 h-4 animate-spin" />
                    : <Fingerprint className="w-4 h-4" />
                  }
                  Tentar Novamente
                </button>
              )}
              <button
                onClick={onCancel}
                className="bg-white/5 border border-white/10 text-[#ccc] hover:text-white font-bold rounded-xl py-3 text-sm hover:bg-white/10 transition-all w-full cursor-pointer flex items-center justify-center gap-2"
              >
                Cancelar
              </button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
