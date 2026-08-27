// app/actions/generate-recurrences.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// gera lançamentos das recorrências ativas para o mês informado (0-11)
export async function generateMonthly(year: number, month: number) {
  const supabase = await createSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: recs, error } = await supabase
    .from('recurrences')
    .select('*')
    .eq('active', true)
  if (error) throw new Error(error.message)
  if (!recs?.length) return { inserted: 0 }

  const lastDay = new Date(year, month + 1, 0).getDate()

  const rows = recs.map((r) => {
    const day = Math.min(r.day_of_month, lastDay) // 31 vira 28/30 conforme o mês
    const due = new Date(year, month, day)
    return {
      user_id: user.id,
      recurrence_id: r.id,
      description: r.description,
      amount: r.amount,
      category: r.category,
      type: r.type,
      due_date: due.toISOString().slice(0, 10),
    }
  })

  // ignora duplicados graças ao índice único
  const { error: insErr, count } = await supabase
    .from('transactions')
    .upsert(rows, {
      onConflict: 'recurrence_id,due_date',
      ignoreDuplicates: true,
      count: 'exact',
    })
  if (insErr) throw new Error(insErr.message)

  revalidatePath('/transactions')
  return { inserted: count ?? 0 }
}
