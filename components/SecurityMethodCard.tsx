// components/SecurityMethodCard.tsx
import { Loader } from 'lucide-react'
import { type ElementType } from 'react'

interface SecurityMethodCardProps {
  icon: ElementType
  title: string
  description: string
  badge: string
  badgeColor: string
  isActive: boolean
  isToggling: boolean
  disabled: boolean
  onToggle: (active: boolean) => void
}

export function SecurityMethodCard({
  icon: Icon,
  title,
  description,
  badge,
  badgeColor,
  isActive,
  isToggling,
  disabled,
  onToggle,
}: SecurityMethodCardProps) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
        isActive
          ? 'bg-orange-500/10 border-orange-500/30'
          : 'bg-white/[0.03] border-white/[0.07]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isActive
              ? 'bg-orange-500/20 border border-orange-500/30'
              : 'bg-white/5 border border-white/10'
          }`}
        >
          <Icon
            className={`w-5 h-5 ${isActive ? 'text-orange-400' : 'text-[#666]'}`}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{title}</p>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
            >
              {badge}
            </span>
          </div>
          <p className="text-xs text-[#666] mt-0.5">{description}</p>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={() => !disabled && !isToggling && onToggle(!isActive)}
        disabled={disabled || isToggling}
        title={
          disabled
            ? 'Você precisa manter pelo menos 1 método ativo'
            : isActive
            ? 'Desativar'
            : 'Ativar'
        }
        className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${isActive ? 'bg-orange-500' : 'bg-white/10'}`}
      >
        {isToggling ? (
          <Loader className="w-3 h-3 text-white animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        ) : (
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
              isActive ? 'left-6' : 'left-0.5'
            }`}
          />
        )}
      </button>
    </div>
  )
}
