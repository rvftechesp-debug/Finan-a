// components/ScoreFinanceiro.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Target, PiggyBank, BarChart3, Shield } from 'lucide-react'

interface Expense {
  amount: number
  date: string
  status?: string
  due_date?: string | null
}

interface IncomeEntry {
  amount: number
  date: string
}

interface Budget {
  [category: string]: number
}

interface BudgetStatus {
  name: string
  spent: number
  budget: number
  pct: number
}

interface ScoreFinanceiroProps {
  monthlyIncome: number
  totalExpenses: number
  savingsRate: number
   expenses: Expense[]
  incomeEntries: IncomeEntry[]
  budgetStatus: BudgetStatus[]
  selectedMonth: number
}

interface ScoreCriteria {
  label: string
  icon: React.ElementType
  score: number
  maxScore: number
  description: string
  color: string
  tip: string
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#F59E0B'
  if (score >= 40) return '#F97316'
  return '#EF4444'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bom'
  if (score >= 40) return 'Regular'
  if (score >= 20) return 'Atenção'
  return 'Crítico'
}

function getScoreEmoji(score: number): string {
  if (score >= 80) return '🏆'
  if (score >= 60) return '😊'
  if (score >= 40) return '😐'
  if (score >= 20) return '😟'
  return '🚨'
}

export function ScoreFinanceiro({
  monthlyIncome,
  totalExpenses,
  savingsRate,
   expenses,
  incomeEntries,
  budgetStatus,
  selectedMonth,
}: ScoreFinanceiroProps) {

  const criteria = useMemo<ScoreCriteria[]>(() => {
    // ── Critério 1: Taxa de Economia (0-25 pts) ──────────────
    let economiaScore = 0
    if (savingsRate >= 30) economiaScore = 25
    else if (savingsRate >= 20) economiaScore = 20
    else if (savingsRate >= 10) economiaScore = 13
    else if (savingsRate >= 0) economiaScore = 6
    else economiaScore = 0

    // ── Critério 2: Controle de Orçamento (0-25 pts) ─────────
    let orcamentoScore = 25
    const categoriesOverBudget = budgetStatus.filter(b => b.budget > 0 && b.pct > 100).length
    const categoriesNearBudget = budgetStatus.filter(b => b.budget > 0 && b.pct > 80 && b.pct <= 100).length
    orcamentoScore -= categoriesOverBudget * 7
    orcamentoScore -= categoriesNearBudget * 3
    orcamentoScore = Math.max(0, orcamentoScore)

    // ── Critério 3: Consistência de Renda (0-20 pts) ─────────
    let rendaScore = 0
    if (monthlyIncome > 0) {
      rendaScore = 10
      const allMonthsIncome = incomeEntries.reduce((acc, e) => {
        const month = new Date(e.date + 'T00:00:00').getMonth()
        acc[month] = (acc[month] || 0) + e.amount
        return acc
      }, {} as Record<number, number>)
      const monthsWithIncome = Object.keys(allMonthsIncome).length
      if (monthsWithIncome >= 6) rendaScore = 20
      else if (monthsWithIncome >= 3) rendaScore = 15
    }

    // ── Critério 4: Contas em Dia (0-20 pts) ─────────────────
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdueExpenses = expenses.filter(e => {
      if (e.status === 'paid' || !e.due_date) return false
      const due = new Date(e.due_date + 'T00:00:00')
      return due < today
    }).length
    let contasScore = 20
    contasScore -= overdueExpenses * 5
    contasScore = Math.max(0, contasScore)

    // ── Critério 5: Equilíbrio Renda/Gastos (0-10 pts) ───────
    let equilibrioScore = 0
    if (monthlyIncome === 0) {
      equilibrioScore = 0
    } else {
      const ratio = totalExpenses / monthlyIncome
      if (ratio <= 0.5) equilibrioScore = 10
      else if (ratio <= 0.7) equilibrioScore = 7
      else if (ratio <= 0.9) equilibrioScore = 4
      else if (ratio <= 1.0) equilibrioScore = 1
      else equilibrioScore = 0
    }

    return [
      {
        label: 'Taxa de Economia',
        icon: PiggyBank,
        score: economiaScore,
        maxScore: 25,
        description: `${savingsRate.toFixed(1)}% da renda economizada`,
        color: economiaScore >= 18 ? '#10B981' : economiaScore >= 10 ? '#F59E0B' : '#EF4444',
        tip: savingsRate < 20
          ? 'Tente economizar pelo menos 20% da sua renda mensal.'
          : 'Ótimo! Você está economizando bem.',
      },
      {
        label: 'Controle de Orçamento',
        icon: Target,
        score: orcamentoScore,
        maxScore: 25,
        description: categoriesOverBudget > 0
          ? `${categoriesOverBudget} categoria(s) acima do limite`
          : 'Todas as categorias dentro do orçamento',
        color: orcamentoScore >= 18 ? '#10B981' : orcamentoScore >= 10 ? '#F59E0B' : '#EF4444',
        tip: categoriesOverBudget > 0
          ? 'Revise os gastos nas categorias que ultrapassaram o orçamento.'
          : 'Continue assim! Orçamento bem controlado.',
      },
      {
        label: 'Consistência de Renda',
        icon: TrendingUp,
        score: rendaScore,
        maxScore: 20,
        description: monthlyIncome > 0
          ? `Renda registrada em ${Object.keys(incomeEntries.reduce((a, e) => ({ ...a, [new Date(e.date + 'T00:00:00').getMonth()]: 1 }), {})).length} meses`
          : 'Nenhuma renda registrada',
        color: rendaScore >= 15 ? '#10B981' : rendaScore >= 8 ? '#F59E0B' : '#EF4444',
        tip: monthlyIncome === 0
          ? 'Registre sua renda mensal para melhor acompanhamento.'
          : 'Mantenha o registro consistente da sua renda.',
      },
      {
        label: 'Contas em Dia',
        icon: Shield,
        score: contasScore,
        maxScore: 20,
        description: overdueExpenses > 0
          ? `${overdueExpenses} conta(s) em atraso`
          : 'Nenhuma conta em atraso',
        color: contasScore >= 15 ? '#10B981' : contasScore >= 8 ? '#F59E0B' : '#EF4444',
        tip: overdueExpenses > 0
          ? 'Quite as contas em atraso para evitar juros e melhorar seu score.'
          : 'Parabéns! Todas as contas em dia.',
      },
      {
        label: 'Equilíbrio Financeiro',
        icon: BarChart3,
        score: equilibrioScore,
        maxScore: 10,
        description: monthlyIncome > 0
          ? `Gastos representam ${Math.round((totalExpenses / monthlyIncome) * 100)}% da renda`
          : 'Sem renda registrada',
        color: equilibrioScore >= 7 ? '#10B981' : equilibrioScore >= 4 ? '#F59E0B' : '#EF4444',
        tip: totalExpenses > monthlyIncome
          ? 'Seus gastos superam sua renda. Reduza despesas com urgência!'
          : 'Bom equilíbrio entre renda e gastos.',
      },
    ]
  }, [monthlyIncome, totalExpenses, savingsRate, expenses, incomeEntries, budgetStatus])

  const totalScore = useMemo(() => criteria.reduce((s, c) => s + c.score, 0), [criteria])
  const scoreColor = getScoreColor(totalScore)
  const scoreLabel = getScoreLabel(totalScore)
  const scoreEmoji = getScoreEmoji(totalScore)

  // Circunferência do círculo SVG
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (totalScore / 100) * circumference

  return (
    <Card className="bg-white/[0.03] border-white/[0.07]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-orange-500" /> Score Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Score Principal */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Círculo animado */}
          <div className="relative flex-shrink-0">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
              {/* Fundo */}
              <circle
                cx="70" cy="70" r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="12"
              />
              {/* Progresso */}
              <circle
                cx="70" cy="70" r={radius}
                fill="none"
                stroke={scoreColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold" style={{ color: scoreColor }}>{totalScore}</span>
              <span className="text-[10px] text-[#888] uppercase tracking-wider">/ 100</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <span className="text-2xl">{scoreEmoji}</span>
              <span className="text-xl font-bold" style={{ color: scoreColor }}>{scoreLabel}</span>
            </div>
            <p className="text-[#888] text-xs mb-3">
              Sua saúde financeira este mês baseada em 5 critérios.
            </p>
            {/* Mini barra de progresso */}
            <div className="bg-white/[0.07] rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-1000"
                style={{ width: `${totalScore}%`, backgroundColor: scoreColor }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#555] mt-1">
              <span>0 Crítico</span>
              <span>40 Regular</span>
              <span>60 Bom</span>
              <span>80+ Excelente</span>
            </div>
          </div>
        </div>

        {/* Critérios detalhados */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#888] uppercase tracking-wider">Detalhamento</p>
          {criteria.map((c, i) => {
            const Icon = c.icon
            const pct = (c.score / c.maxScore) * 100
            return (
              <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${c.color}18`, border: `1px solid ${c.color}30` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#ddd]">{c.label}</p>
                      <p className="text-[10px] text-[#666]">{c.description}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="font-bold text-sm" style={{ color: c.color }}>{c.score}</span>
                    <span className="text-[#555] text-[10px]">/{c.maxScore}</span>
                  </div>
                </div>
                <div className="bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: c.color }}
                  />
                </div>
                <p className="text-[#555] text-[10px] mt-1.5 leading-relaxed">
                  💡 {c.tip}
                </p>
              </div>
            )
          })}
        </div>

        {/* Mensagem final */}
        <div className={`rounded-xl p-3 border text-xs leading-relaxed ${
          totalScore >= 80
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : totalScore >= 60
            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
            : totalScore >= 40
            ? 'bg-orange-500/10 border-orange-500/20 text-orange-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {totalScore >= 80 && '🏆 Parabéns! Sua saúde financeira está excelente. Continue mantendo a disciplina e seus objetivos estão ao alcance!'}
          {totalScore >= 60 && totalScore < 80 && '😊 Bom trabalho! Você está no caminho certo. Pequenos ajustes nos critérios mais fracos podem elevar seu score para excelente.'}
          {totalScore >= 40 && totalScore < 60 && '😐 Situação regular. Há espaço para melhorar — foque primeiro em quitar contas em atraso e controlar o orçamento.'}
          {totalScore >= 20 && totalScore < 40 && '😟 Atenção necessária! Seus gastos estão comprometendo sua saúde financeira. Revise seus hábitos com urgência.'}
          {totalScore < 20 && '🚨 Situação crítica. Procure ajuda financeira e comece pelo básico: registre sua renda e corte gastos desnecessários.'}
        </div>

      </CardContent>
    </Card>
  )
}
