type Props = {
  score: number
  label: string
  breakdown: { savings: number; spending: number; goals: number }
}

const colorFor = (s: number) =>
  s >= 80 ? 'text-green-600' : s >= 60 ? 'text-blue-600' : s >= 40 ? 'text-yellow-600' : 'text-red-600'

export function ScoreCard({ score, label, breakdown }: Props) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Score Financeiro</h2>
      <div className="flex items-baseline gap-2">
        <p className={`text-4xl font-bold ${colorFor(score)}`}>{score}</p>
        <span className="text-muted-foreground">/100</span>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>

      {/* barra */}
      <div className="mt-3 h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-current transition-all"
          style={{ width: `${score}%` }}
        />
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <li>Economia: <b>{breakdown.savings}</b></li>
        <li>Gastos: <b>{breakdown.spending}</b></li>
        <li>Metas: <b>{breakdown.goals}</b></li>
      </ul>
    </section>
  )
}
