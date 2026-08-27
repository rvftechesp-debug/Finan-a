// app/actions/analytics.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'

type Txn = { amount: number; category: string; type: 'expense' | 'income'; due_date: string }

const ymd = (d: Date) => d.toISOString().slice(0, 10)

export async function getAnalytics(_userId?: string) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const empty = {
    score: { score: 0, label: 'Atenção', breakdown: { savings: 0, spending: 0, goals: 0 } },
    comparison: [] as { category: string; deltaPct: number; message: string }[],
    projection: { currentBalance: 0, projectedBalance: 0, dailyAvgSpend: 0, remainingDays: 0 },
  }
  if (!user) return empty

  const now = new Date()
  const startCur = new Date(now.getFullYear(), now.getMonth(), 1)
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [{ data: cur }, { data: prev }, { data: budgets }] = await Promise.all([
    supabase.from('transactions').select('amount, category, type, due_date')
      .gte('due_date', ymd(startCur)),
    supabase.from('transactions').select('amount, category, type, due_date')
      .gte('due_date', ymd(startPrev)).lt('due_date', ymd(startCur)),
    supabase.from('budgets').select('limit_amount'),
  ])

  const curTx = (cur ?? []) as Txn[]
  const prevTx = (prev ?? []) as Txn[]

  const sum = (a: Txn[]) => a.reduce((t, x) => t + Number(x.amount), 0)
  const expCurArr = curTx.filter(t => t.type === 'expense')
  const incCurArr = curTx.filter(t => t.type === 'income')
  const expPrevArr = prevTx.filter(t => t.type === 'expense')

  const expCurTotal = sum(expCurArr)
  const incCurTotal = sum(incCurArr)

  // SCORE
  const savedRatio = incCurTotal > 0 ? Math.max(0, (incCurTotal - expCurTotal) / incCurTotal) : 0
  const scoreValue = Math.round(savedRatio * 100)
  const label = scoreValue >= 80 ? 'Excelente' : scoreValue >= 60 ? 'Bom' : scoreValue >= 40 ? 'Regular' : 'Atenção'

  const totalBudget = (budgets ?? []).reduce((t, b) => t + Number(b.limit_amount), 0)
  const goalsPct = totalBudget > 0 ? Math.round(Math.min(100, (expCurTotal / totalBudget) * 100)) : 0

  const score = {
    score: scoreValue,
    label,
    breakdown: {
      savings: Math.round(savedRatio * 100),
      spending: incCurTotal > 0 ? Math.round((expCurTotal / incCurTotal) * 100) : 0,
      goals: goalsPct,
    },
  }

  // COMPARISON
  const byCat = (a: Txn[]) => {
    const m = new Map<string, number>()
    for (const x of a) m.set(x.category ?? 'Outros', (m.get(x.category ?? 'Outros') ?? 0) + Number(x.amount))
    return m
  }
  const curCats = byCat(expCurArr)
  const prevCats = byCat(expPrevArr)

  const comparison = [...curCats.entries()]
    .map(([category, current]) => {
      const previous = prevCats.get(category) ?? 0
      const deltaPct = previous > 0 ? ((current - previous) / previous) * 100 : 0
      const dir = deltaPct > 0 ? 'aumentou' : 'reduziu'
      return { category, deltaPct, message: `${category} ${dir} ${Math.abs(Math.round(deltaPct))}%` }
    })
    .filter(c => c.deltaPct !== 0)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))

  // PROJECTION
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const remainingDays = daysInMonth - dayOfMonth
  const dailyAvgSpend = dayOfMonth > 0 ? expCurTotal / dayOfMonth : 0
  const currentBalance = incCurTotal - expCurTotal
  const projectedBalance = Math.round(currentBalance - dailyAvgSpend * remainingDays)

  const projection = {
    currentBalance: Math.round(currentBalance),
    projectedBalance,
    dailyAvgSpend: Math.round(dailyAvgSpend),
    remainingDays,
  }

  return { score, comparison, projection }
}
