// app/actions/recurrences.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { recurrenceSchema, type RecurrenceInput } from './recurrences.schema'

export type Recurrence = {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  type: 'expense' | 'income'
  day_of_month: number
  is_active: boolean
  created_at: string
}

export type ActionResult =
  | { success: true }
  | { success: false; errors: Record<string, string> }

// Helper: transforma erros do Zod em { campo: mensagem }
function formatZodErrors(error: import('zod').ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!out[key]) out[key] = issue.message
  }
  return out
}

// LISTAR
export async function listRecurrences(): Promise<Recurrence[]> {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('recurrences')
    .select('*')
    .eq('is_active', true)
    .order('day_of_month', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

// CRIAR (com validação)
export async function createRecurrence(input: RecurrenceInput): Promise<ActionResult> {
  const parsed = recurrenceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, errors: formatZodErrors(parsed.error) }
  }

  const supabase = await createSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, errors: { form: 'Não autenticado' } }

  const { description, amount, category, type, dayOfMonth } = parsed.data

  const { error } = await supabase.from('recurrences').insert({
    user_id: user.id,
    description,
    amount,
    category,
    type,
    day_of_month: dayOfMonth,
  })

  if (error) return { success: false, errors: { form: error.message } }

  revalidatePath('/recurrences')
  return { success: true }
}

// ATUALIZAR (validação parcial)
export async function updateRecurrence(
  id: string,
  input: Partial<RecurrenceInput>
): Promise<ActionResult> {
  const parsed = recurrenceSchema.partial().safeParse(input)
  if (!parsed.success) {
    return { success: false, errors: formatZodErrors(parsed.error) }
  }

  const supabase = await createSupabaseServer()
  const payload: Record<string, unknown> = {}
  const d = parsed.data
  if (d.description !== undefined) payload.description = d.description
  if (d.amount !== undefined) payload.amount = d.amount
  if (d.category !== undefined) payload.category = d.category
  if (d.type !== undefined) payload.type = d.type
  if (d.dayOfMonth !== undefined) payload.day_of_month = d.dayOfMonth

  const { error } = await supabase.from('recurrences').update(payload).eq('id', id)
  if (error) return { success: false, errors: { form: error.message } }

  revalidatePath('/recurrences')
  return { success: true }
}

// SOFT DELETE
export async function deleteRecurrence(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServer()
  const { error } = await supabase
    .from('recurrences')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { success: false, errors: { form: error.message } }

  revalidatePath('/recurrences')
  return { success: true }
}
