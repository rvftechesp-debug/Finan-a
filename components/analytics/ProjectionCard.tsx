type Props = {
  currentBalance: number
  projectedBalance: number
  dailyAvgSpend: number
  remainingDays: number
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function ProjectionCard({
  currentBalance,
  projectedBalance,
  dailyAvgSpend,
  remainingDays,
}: Props) {
  const positive = projectedBalance >= 0
  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Projeção de Saldo</h2>
      <p className="mt-1 text-sm text-muted-foreground">Saldo atual: {brl(currentBalance)}</p>
      <p className={`text-2xl font-bold ${positive ? 'text-green-600' : 'text-red-600'}`}>
        {brl(projectedBalance)}
      </p>
      <p className="text-xs text-muted-foreground">
        Estimado para o fim do mês · média de {brl(dailyAvgSpend)}/dia · faltam {remainingDays} dias
      </p>
    </section>
  )
}
