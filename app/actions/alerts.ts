// app/actions/alerts.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { listRecurrences } from './recurrences'

export type DueAlert = {
  id: string
  description: string
  amount: number
  category: string
  dayOfMonth: number
  dueDate: string       // ISO da próxima ocorrência
  daysUntil: number     // negativo = vencido
  status: 'overdue' | 'today' | 'soon' | 'upcoming'
}

// Retorna a próxima data de vencimento respeitando meses curtos
function nextDueDate(dayOfMonth: number, from = new Date()): Date {
  const y = from.getFullYear()
  const m = from.getMonth()
  const clamp = (yy: number, mm: number) => {
    const lastDay = new Date(yy, mm + 1, 0).getDate()
    return new Date(yy, mm, Math.min(dayOfMonth, lastDay))
  }
  const thisMonth = clamp(y, m)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return thisMonth >= today ? thisMonth : clamp(y, m + 1)
}

function diffDays(a: Date, b: Date) {
  const MS = 86_400_000
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((da.getTime() - db.getTime()) / MS)
}

// windowDays = quantos dias à frente considerar
export async function getDueAlerts(windowDays = 7): Promise<DueAlert[]> {
  const recurrences = await listRecurrences()
  const today = new Date()

  return recurrences
    .filter((r) => r.type === 'expense')
    .map((r) => {
      const dueDate = nextDueDate(r.day_of_month, today)
      const daysUntil = diffDays(dueDate, today)
      const status: DueAlert['status'] =
        daysUntil < 0 ? 'overdue' : daysUntil === 0 ? 'today' : daysUntil <= 3 ? 'soon' : 'upcoming'
      return {
        id: r.id,
        description: r.description,
        amount: r.amount,
        category: r.category,
        dayOfMonth: r.day_of_month,
        dueDate: dueDate.toISOString(),
        daysUntil,
        status,
      }
    })
    .filter((a) => a.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}
