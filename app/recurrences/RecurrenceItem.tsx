'use client'

import { useTransition } from 'react'
import { deleteRecurrence, type Recurrence } from '@/app/actions/recurrences'

export function RecurrenceItem({ item }: { item: Recurrence }) {
  const [pending, startTransition] = useTransition()

  const brl = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(item.amount)

  return (
    <li className="flex items-center justify-between border rounded px-4 py-3">
      <div className="flex flex-col">
        <span className="font-medium">{item.description}</span>
        <span className="text-sm text-gray-500">
          {item.category} · dia {item.day_of_month}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span
          className={item.type === 'income' ? 'text-green-600' : 'text-red-600'}
        >
          {item.type === 'income' ? '+' : '-'} {brl}
        </span>
        <button
          onClick={() => startTransition(() => { deleteRecurrence(item.id); })}
          disabled={pending}
          className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-50"
        >
          {pending ? '...' : 'Remover'}
        </button>
      </div>
    </li>
  )
}
