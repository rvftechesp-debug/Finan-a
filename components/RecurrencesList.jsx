// components/RecurrencesList.jsx
'use client';
import { useState } from 'react';
import { useRecurrences } from '@/hooks/useRecurrences';

export default function RecurrencesList() {
  const { recurrences, loading, error, create, remove } = useRecurrences();
  const [form, setForm] = useState({
    description: '', amount: '', type: 'receita',
    category: '', day_of_month: 1, start_date: '',
  });

  if (loading) return <p>Carregando...</p>;
  if (error) return <p>Erro: {error}</p>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await create({ ...form, amount: parseFloat(form.amount) });
    setForm({ description: '', amount: '', type: 'receita', category: '', day_of_month: 1, start_date: '' });
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input placeholder="Descrição" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Valor" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
        <input placeholder="Categoria" value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input type="number" min="1" max="31" value={form.day_of_month}
          onChange={(e) => setForm({ ...form, day_of_month: parseInt(e.target.value) })} />
        <input type="date" value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
        <button type="submit">Adicionar</button>
      </form>

      <ul>
        {recurrences.map((r) => (
          <li key={r.id}>
            {r.description} — R$ {r.amount} ({r.type}) — dia {r.day_of_month}
            <button onClick={() => remove(r.id)}>Remover</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
