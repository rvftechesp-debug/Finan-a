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
        if (row.is_active) map[row.method] = true
      })
      setMethods(map)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchMethods()
  }, [fetchMethods])

  // ✅ useMemo para evitar recalculo desnecessário
  const totalAtivos = useMemo(
    () => Object.values(methods).filter(Boolean).length,
    [methods]
  )

  // ✅ useCallback para estabilizar referência e evitar closure stale
  const isDisabled = useCallback(
    (method: AuthMethod): boolean => {
      return methods[method] && totalAtivos === 1
    },
    [methods, totalAtivos]
  )

  // ✅ useCallback com dependências corretas
  const toggle = useCallback(
    async (method: AuthMethod, active: boolean): Promise<string | null> => {
      if (!userId) return 'Usuário não autenticado'

      if (!active && totalAtivos === 1 && methods[method]) {
        return 'Mantenha pelo menos 1 método ativo para garantir o acesso à conta.'
      }

      setToggling(method)

      try {
        const { data: existing } = await supabase
          .from('user_auth_methods')
          .select('id')
          .eq('user_id', userId)
          .eq('method', method)
          .single()

        let error

        if (existing) {
          ;({ error } = await supabase
            .from('user_auth_methods')
            .update({ is_active: active, updated_at: new Date().toISOString() })
            .eq('id', existing.id))
        } else {
          ;({ error } = await supabase
            .from('user_auth_methods')
            .insert({ user_id: userId, method, is_active: active }))
        }

        if (error) return 'Erro ao salvar. Tente novamente.'

        setMethods((prev) => ({ ...prev, [method]: active }))
        return null
      } catch {
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
