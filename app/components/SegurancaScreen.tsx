// components/SegurancaScreen.tsx
'use client'

import { Loader } from 'lucide-react'
import { ShieldCheck, Fingerprint, ScanFace, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuthMethods } from '@/app/hooks/useAuthMethods'
import { SecurityMethodCard } from '@/components/SecurityMethodCard'
import { useEffect, useState } from 'react'

type Method = 'totp' | 'biometric' | 'passkey'

const METODOS: {
  key: Method
  icon: React.ElementType
  title: string
  description: string
  badge: string
  badgeColor: string
  mobileOnly?: boolean  // 👈 nova propriedade
}[] = [
  {
    key: 'totp',
    icon: ShieldCheck,
    title: '2FA — Autenticador',
    description: 'Código de 6 dígitos via Google Authenticator ou similar',
    badge: 'Recomendado',
    badgeColor: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    mobileOnly: false, // disponível em todos
  },
  {
    key: 'biometric',
    icon: Fingerprint,
    title: 'Biometria',
    description: 'Autenticação por impressão digital no dispositivo',
    badge: 'Dispositivo',
    badgeColor: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    mobileOnly: true, // 📱 apenas mobile
  },
  {
    key: 'passkey',
    icon: ScanFace,
    title: 'Face ID / Passkey',
    description: 'Reconhecimento facial ou chave de acesso do dispositivo',
    badge: 'Passkey',
    badgeColor: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    mobileOnly: true, // 📱 apenas mobile
  },
]

// ✅ Hook para detectar se é mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () =>
      setIsMobile(/Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent))
    check()
  }, [])

  return isMobile
}

interface SegurancaScreenProps {
  userId: string
}

export default function SegurancaScreen({ userId }: SegurancaScreenProps) {
  const { methods, totalAtivos, loading, toggling, toggle, isDisabled } =
    useAuthMethods(userId)

  const isMobile = useIsMobile()

  // ✅ Filtra os métodos de acordo com o dispositivo
  const metodosFiltrados = METODOS.filter((m) => !m.mobileOnly || isMobile)

  return (
    <div className="space-y-3">

      {/* Cabeçalho */}
      <div>
        <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-500" />
          Métodos de Autenticação
        </h2>
        <p className="text-xs text-[#666] mt-1">
          Escolha como deseja autenticar no login. Pelo menos{' '}
          <strong className="text-orange-400">1 método</strong> deve permanecer ativo.
        </p>
      </div>

      {/* Indicador de métodos ativos */}
      {!loading && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
            totalAtivos >= 2
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : totalAtivos === 1
              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {totalAtivos >= 2 ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> {totalAtivos} métodos ativos — ótima segurança!</>
          ) : totalAtivos === 1 ? (
            <><AlertTriangle className="w-3.5 h-3.5" /> Apenas 1 método ativo — considere ativar mais.</>
          ) : (
            <><AlertTriangle className="w-3.5 h-3.5" /> Nenhum método ativo — ative pelo menos 1.</>
          )}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 text-orange-500 animate-spin" />
          <span className="text-[#666] text-sm ml-2">Carregando...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {metodosFiltrados.map((item) => (  // 👈 usa metodosFiltrados
            <SecurityMethodCard
              key={item.key}
              icon={item.icon}
              title={item.title}
              description={item.description}
              badge={item.badge}
              badgeColor={item.badgeColor}
              isActive={methods[item.key]}
              isToggling={toggling === item.key}
              disabled={isDisabled(item.key)}
              onToggle={(active) => toggle(item.key, active)}
            />
          ))}
        </div>
      )}

      {/* Rodapé informativo */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
        <p className="text-[#555] text-xs leading-relaxed">
          🔒 Os métodos marcados ficam disponíveis como opção ao fazer login.
          O último método ativo não pode ser desativado para garantir o acesso à conta.
        </p>
      </div>

    </div>
  )
}
