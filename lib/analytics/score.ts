import { Transaction, Goal } from './types'

export function calcFinancialScore(txs: Transaction[], goals: Goal[]) {
  const income = sum(txs, 'income')
  const expense = sum(txs, 'expense')

  // 1) Taxa de economia (0-50 pts)
  const savingsRate = income > 0 ? (income - expense) / income : 0
  const savingsScore = clamp(savingsRate * 100, 0, 50) // 50% economia = nota máxima

  // 2) Controle de gastos: gasto <= 100% da renda (0-30 pts)
  const spendRatio = income > 0 ? expense / income : 1
  const spendScore = clamp((1 - spendRatio) * 60, 0, 30)

  // 3) Progresso de metas (0-20 pts)
  const goalProgress = goals.length
    ? goals.reduce((a, g) => a + Math.min(g.savedAmount / g.targetAmount, 1), 0) / goals.length
    : 0
  const goalScore = goalProgress * 20

  const score = Math.round(savingsScore + spendScore + goalScore)

  return {
    score: clamp(score, 0, 100),
    breakdown: {
      savings: Math.round(savingsScore),
      spending: Math.round(spendScore),
      goals: Math.round(goalScore),
    },
    label: labelFor(score),
  }
}

function labelFor(s: number) {
  if (s >= 80) return 'Excelente'
  if (s >= 60) return 'Boa'
  if (s >= 40) return 'Regular'
  return 'Atenção'
}

const sum = (txs: Transaction[], type: Transaction['type']) =>
  txs.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0)

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n))
