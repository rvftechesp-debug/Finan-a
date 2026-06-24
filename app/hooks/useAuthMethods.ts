// app/hooks/useAuthMethods.ts
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export type AuthMethod = 'totp' | 'biometric' | 'passkey'

interface AuthMethods {
  totp: boolean
  biometric: boolean
  passkey: boolean
}

interface UseAuthMethodsReturn {
  methods: AuthMethods
  loading: boolean
  toggling: AuthMethod | null
  toggle: (method: AuthMethod, active: boolean) => Promise<string | null>
  totalAtivos: number
  isDisabled: (method: AuthMethod) => boolean
  refetch: () => Promise<void>
}

export function useAuthMethods(userId: string | null): UseAuthMethodsReturn {
  const [methods, setMethods] = useState<AuthMethods>({
    totp: false,
    biometric: false,
    passkey: false,
  })
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<AuthMethod | null>(null)

  const fetchMethods = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('user_auth_methods')
      .select('method, is_active')
      .eq('user_id', userId)

    if (!error && data) {
      const map: AuthMethods = { totp: false, biometric: false, passkey: false }
      data.forEach((row: { method: AuthMethod; is_active: boolean }) => {
        // ✅ mapeia independente de is_active ser true ou false
        map[row.method] = row.is_active ?? false
      })
      setMethods(map)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchMethods()
  }, [fetchMethods])

  const totalAtivos = useMemo(
    () => Object.values(methods).filter(Boolean).length,
    [methods]
  )

  const isDisabled = useCallback(
    (method: AuthMethod): boolean => {
      return methods[method] === true && totalAtivos === 1
    },
    [methods, totalAtivos]
  )

  const toggle = useCallback(
    async (method: AuthMethod, active: boolean): Promise<string | null> => {
      if (!userId) return 'Usuário não autenticado'

      if (!active && totalAtivos === 1 && methods[method]) {
        return 'Mantenha pelo menos 1 método ativo para garantir o acesso à conta.'
      }

      setToggling(method)

      try {
        const { error } = await supabase
          .from('user_auth_methods')
          .upsert(
            {
              user_id: userId,
              method,
              is_active: active,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,method',
              ignoreDuplicates: false,
            }
          )

        if (error) {
          console.error('Erro upsert:', error.message, error.details, error.hint)
          return 'Erro ao salvar. Tente novamente.'
        }

        // ✅ só atualiza estado após confirmar sucesso no banco
        setMethods(prev => ({ ...prev, [method]: active }))
        return null
      } catch (err) {
        console.error('Erro inesperado:', err)
        return 'Erro inesperado. Tente novamente.'
      } finally {
        setToggling(null)
      }
    },
    [userId, methods, totalAtivos]
  )

  return {
    methods,
    loading,
    toggling,
    toggle,
    totalAtivos,
    isDisabled,
    refetch: fetchMethods,
  }
}
