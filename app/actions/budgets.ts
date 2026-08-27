// app/actions/budgets.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'

const schema = z.object({
  category: z.string().trim().min(2).max(40),
  limitAmount: z.number().positive(),
})

export async function createBudget(input: unknown) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      errors: Object.fromEntries(
        parsed.error.issues.map(i => [i.path[0], i.message])
      ) as Record<string, string>,
    }
  }

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, errors: { category: 'Não autenticado' } }

  const { error } = await supabase.from('budgets').upsert(
    {
      user_id: user.id,
      category: parsed.data.category,
      limit_amount: parsed.data.limitAmount,
    },
    { onConflict: 'user_id,category' }
  )

  if (error) return { success: false as const, errors: { category: error.message } }

  revalidatePath('/budgets')
  return { success: true as const, errors: {} }
}

export type BudgetProgress = {
  id: string
  category: string
  limitAmount: number
  spent: number
  remaining: number
  percent: number
  status: 'ok' | 'warning' | 'exceeded'
}

export async function getBudgetProgress(): Promise<BudgetProgress[]> {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, category, limit_amount')
    .order('category')

  if (!budgets?.length) return []

  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const { data: txns } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('type', 'expense')
    .gte('due_date', start.toISOString().slice(0, 10))

  const spentByCat = new Map<string, number>()
  txns?.forEach(t => {
    spentByCat.set(t.category, (spentByCat.get(t.category) ?? 0) + Number(t.amount))
  })

  return budgets.map(b => {
    const limit = Number(b.limit_amount)
    const spent = spentByCat.get(b.category) ?? 0
    const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0
    const remaining = limit - spent
    const status: BudgetProgress['status'] =
      spent > limit ? 'exceeded' : percent >= 80 ? 'warning' : 'ok'

    return { id: b.id, category: b.category, limitAmount: limit, spent, remaining, percent, status }
  })
}

export async function deleteBudget(id: string) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) return { success: false as const }
  revalidatePath('/budgets')
  return { success: true as const }
}
