type Item = {
  category: string
  deltaPct: number
  message: string
}

export function ComparisonList({ items }: { items: Item[] }) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Comparativo Mensal</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Sem dados suficientes.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {items.slice(0, 5).map((c) => (
            <li key={c.category} className="flex items-center justify-between">
              <span>{c.message}</span>
              <span className={c.deltaPct > 0 ? 'text-red-600' : 'text-green-600'}>
                {c.deltaPct > 0 ? '▲' : '▼'} {Math.abs(Math.round(c.deltaPct))}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
