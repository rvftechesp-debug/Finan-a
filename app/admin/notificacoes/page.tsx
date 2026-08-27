'use client';

import { useState } from 'react';


export default function AdminNotificacoes() {
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [plano, setPlano] = useState('todos');
  const [enviando, setEnviando] = useState(false);

  async function enviarNotificacao() {
  setEnviando(true);
  const res = await fetch('/api/admin/notificacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: titulo,
      message: mensagem,
      target_plan: plano === 'todos' ? 'all' : plano,
    }),
  });
  setEnviando(false);
  if (!res.ok) {
    const { error } = await res.json();
    alert('Erro: ' + error);
    return;
  }
  alert('Notificação enviada!');
  setTitulo('');
  setMensagem('');
}


  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <h1>Enviar Notificação</h1>

      <input
        placeholder="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
      />

      <textarea
        placeholder="Mensagem"
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        rows={4}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
      />

      <div>
        <label
          className="text-xs text-gray-500 uppercase tracking-wider mb-1 block"
        >
          Destinatários
        </label>
        <select
          value={plano}
          onChange={(e) => setPlano(e.target.value)}
          className="bg-[#1e1a14] border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-400"
        >
          <option value="todos">Todos os usuários</option>
          <option value="Pro">Apenas Pro</option>
          <option value="Plus">Apenas Plus</option>
          <option value="Master">Apenas Master</option>
        </select>
      </div>

      <button
        onClick={enviarNotificacao}
        disabled={!titulo || !mensagem || enviando}
        className="bg-orange-500 text-[#1a1208] font-bold px-6 py-2.5 rounded-xl hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ marginTop: 10 }}
      >
        {enviando ? '⏳ Enviando...' : '🚀 Enviar Notificação'}
      </button>
    </div>
  );
}
