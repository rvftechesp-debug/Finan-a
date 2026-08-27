// app/recurrences/RecurrenceForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { createRecurrence } from '@/app/actions/recurrences'
import { recurrenceSchema } from '@/app/actions/recurrences.schema'

const initialForm = {
  description: '',
  amount: '',
  category: '',
  type: 'expense' as 'expense' | 'income',
  dayOfMonth: '1',
}

export function RecurrenceForm() {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    // Validação no client (feedback instantâneo)
    const candidate = {
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      type: form.type,
      dayOfMonth: parseInt(form.dayOfMonth),
    }

    const parsed = recurrenceSchema.safeParse(candidate)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    startTransition(async () => {
      const result = await createRecurrence(parsed.data)
      if (!result.success) {
        setErrors(result.errors)
        return
      }
      setForm(initialForm)
    })
  }

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <div>
        <input
          placeholder="Descrição (ex: Netflix)"
          value={form.description}
          onChange={set('description')}
          className="border rounded px-3 py-2 w-full"
        />
        {errors.description && <Err msg={errors.description} />}
      </div>

      <div>
        <input
          type="number"
          step="0.01"
          placeholder="Valor"
          value={form.amount}
          onChange={set('amount')}
          className="border rounded px-3 py-2 w-full"
        />
        {errors.amount && <Err msg={errors.amount} />}
      </div>

      <div>
        <input
          placeholder="Categoria (ex: Assinaturas)"
          value={form.category}
          onChange={set('category')}
          className="border rounded px-3 py-2 w-full"
        />
        {errors.category && <Err msg={errors.category} />}
      </div>

      <select value={form.type} onChange={set('type')} className="border rounded px-3 py-2">
        <option value="expense">Despesa</option>
        <option value="income">Receita</option>
      </select>

      <select value={form.dayOfMonth} onChange={set('dayOfMonth')} className="border rounded px-3 py-2">
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            Dia {d}
          </option>
        ))}
      </select>

      {errors.form && <Err msg={errors.form} />}

      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {pending ? 'Salvando...' : 'Adicionar recorrência'}
      </button>
    </form>
  )
}

function Err({ msg }: { msg: string }) {
  return <p className="text-sm text-red-600 mt-1">{msg}</p>
}
