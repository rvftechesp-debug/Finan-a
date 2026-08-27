import { Transaction } from './types'

type CategoryDelta = {
  category: string
  current: number
  previous: number
  deltaPct: number // + = gastou mais
  message: string
}

export function compareMonths(
  current: Transaction[],
  previous: Transaction[]
): CategoryDelta[] {
  const cur = groupByCategory(current)
  const prev = groupByCategory(previous)
  const categories = new Set([...Object.keys(cur), ...Object.keys(prev)])

  return [...categories]
    .map((category) => {
      const c = cur[category] ?? 0
      const p = prev[category] ?? 0
      const deltaPct = p > 0 ? ((c - p) / p) * 100 : c > 0 ? 100 : 0
      return { category, current: c, previous: p, deltaPct, message: msg(category, deltaPct) }
    })
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
}

function msg(cat: string, pct: number) {
  const abs = Math.abs(Math.round(pct))
  if (abs < 1) return `Seu gasto em ${cat} ficou estável`
  return pct > 0
    ? `Você gastou ${abs}% mais que o mês passado em ${cat}`
    : `Você gastou ${abs}% menos que o mês passado em ${cat}`
}

const groupByCategory = (txs: Transaction[]) =>
  txs
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount
      return acc
    }, {})
