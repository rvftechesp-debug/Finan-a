import { Transaction } from './types'

export function projectBalance(txs: Transaction[], startBalance = 0, ref = new Date()) {
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = ref.getDate()

  const monthTxs = txs.filter((t) => {
    const d = new Date(t.date)
    return d.getFullYear() === year && d.getMonth() === month
  })

  const income = monthTxs.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const spent = monthTxs.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)

  const dailyAvg = today > 0 ? spent / today : 0
  const remainingDays = daysInMonth - today
  const projectedExtraSpend = dailyAvg * remainingDays

  const currentBalance = startBalance + income - spent
  const projectedBalance = currentBalance - projectedExtraSpend

  return {
    currentBalance: round(currentBalance),
    projectedBalance: round(projectedBalance),
    dailyAvgSpend: round(dailyAvg),
    remainingDays,
    projectedExtraSpend: round(projectedExtraSpend),
  }
}

const round = (n: number) => Math.round(n * 100) / 100
