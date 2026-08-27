// app/components/BudgetProgressList.tsx
import { getBudgetProgress, type BudgetProgress } from '@/app/actions/budgets'

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const barColor: Record<BudgetProgress['status'], string> = {
  ok: 'bg-green-500',
  warning: 'bg-yellow-500',
  exceeded: 'bg-red-500',
}

export async function BudgetProgressList() {
  const budgets = await getBudgetProgress()

  if (budgets.length === 0)
    return <p className="text-sm text-gray-500">Nenhum orçamento definido ainda.</p>

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold">Orçamento do mês</h2>
      {budgets.map((b) => (
        <div key={b.id}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{b.category}</span>
            <span className={b.status === 'exceeded' ? 'text-red-600 font-semibold' : ''}>
              {brl(b.spent)} / {brl(b.limitAmount)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full ${barColor[b.status]} transition-all`}
              style={{ width: `${Math.min(b.percent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {b.status === 'exceeded'
              ? `Estourou ${brl(-b.remaining)}`
              : `Resta ${brl(b.remaining)} · ${b.percent}%`}
          </p>
        </div>
      ))}
    </div>
  )
}
