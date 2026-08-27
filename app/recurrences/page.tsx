// app/recurrences/page.tsx
import { listRecurrences } from '@/app/actions/recurrences'
import { RecurrenceForm } from './RecurrenceForm'
import { RecurrenceItem } from './RecurrenceItem'

export default async function RecurrencesPage() {
  const items = await listRecurrences()

  return (
    <main className="p-6 flex flex-col gap-8">
      <section>
        <h1 className="text-xl font-bold mb-4">Nova recorrência</h1>
        <RecurrenceForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Suas recorrências</h2>
        {items.length === 0 ? (
          <p className="text-gray-500">Nenhuma recorrência cadastrada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((r) => (
              <RecurrenceItem key={r.id} item={r} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
