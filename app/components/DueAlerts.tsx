// app/components/DueAlerts.tsx
import { getDueAlerts, type DueAlert } from '@/app/actions/alerts'

const config: Record<DueAlert['status'], { label: string; cls: string }> = {
  overdue: { label: 'Vencido', cls: 'bg-red-100 text-red-700 border-red-300' },
  today: { label: 'Vence hoje', cls: 'bg-orange-100 text-orange-700 border-orange-300' },
  soon: { label: 'Em breve', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  upcoming: { label: 'Programado', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export async function DueAlerts() {
  const alerts = await getDueAlerts(7)

  if (alerts.length === 0)
    return <p className="text-sm text-gray-500">Nenhum vencimento nos próximos 7 dias 🎉</p>

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-semibold">Próximos vencimentos</h2>
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${config[a.status].cls}`}
        >
          <div>
            <p className="font-medium">{a.description}</p>
            <p className="text-xs opacity-80">
              {config[a.status].label} · dia {a.dayOfMonth}
              {a.daysUntil > 0 && ` · em ${a.daysUntil} dia(s)`}
            </p>
          </div>
          <span className="font-semibold">{brl(a.amount)}</span>
        </div>
      ))}
    </div>
  )
}
