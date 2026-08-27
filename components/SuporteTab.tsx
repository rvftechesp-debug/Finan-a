// components/SuporteTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, CheckCircle2, Loader, Plus, X, MessageSquare, Clock, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Ticket {
  id: string
  title: string
  message: string
  category: string
  priority: string
  status: string
  admin_reply: string | null
  created_at: string
  updated_at: string
}

interface SuporteTabProps {
  userId: string
}

const STATUS_COLORS: Record<string, string> = {
  aberto: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  'em andamento': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  resolvido: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  fechado: 'bg-gray-500/20 border-gray-500/30 text-gray-400',
}

const STATUS_ICONS: Record<string, string> = {
  aberto: '🟡',
  'em andamento': '🔵',
  resolvido: '✅',
  fechado: '⛔',
}

const PRIORITY_COLORS: Record<string, string> = {
  baixa: 'bg-gray-500/20 text-gray-400',
  normal: 'bg-blue-500/20 text-blue-400',
  alta: 'bg-orange-500/20 text-orange-400',
  urgente: 'bg-red-500/20 text-red-400',
}

const CATEGORIES = ['geral', 'financeiro', 'técnico', 'conta', 'sugestão', 'outro']
const PRIORITIES = ['baixa', 'normal', 'alta', 'urgente']

export function SuporteTab({ userId }: SuporteTabProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    title: '',
    message: '',
    category: 'geral',
    priority: 'normal',
  })

  const loadTickets = async () => {
    setLoading(true)
    const res = await fetch('/api/tickets')
    const data = await res.json()
    if (Array.isArray(data)) setTickets(data)
    setLoading(false)
  }

  useEffect(() => { loadTickets() }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('Digite um título'); return }
    if (!form.message.trim()) { setError('Digite a mensagem'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao enviar ticket'); return }

      setSuccess('Ticket enviado com sucesso! Nossa equipe responderá em breve.')
      setShowForm(false)
      setForm({ title: '', message: '', category: 'geral', priority: 'normal' })
      loadTickets()
      setTimeout(() => setSuccess(''), 5000)
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const openTickets = tickets.filter(t => t.status === 'aberto').length
  const resolvedTickets = tickets.filter(t => t.status === 'resolvido').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-500" /> Suporte
          </h2>
          <p className="text-xs text-[#888] mt-0.5">Abra tickets e acompanhe suas solicitações</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSelectedTicket(null) }}
          className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-4 py-2.5 text-sm hover:opacity-85 transition-opacity flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: tickets.length, color: 'text-white' },
          { label: 'Abertos', value: openTickets, color: 'text-yellow-400' },
          { label: 'Resolvidos', value: resolvedTickets, color: 'text-emerald-400' },
        ].map(s => (
          <Card key={s.label} className="bg-white/[0.03] border-white/[0.07]">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-[#888] mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mensagens */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">{success}</p>
        </div>
      )}

      {/* Formulário novo ticket */}
      {showForm && (
        <Card className="bg-white/[0.03] border-orange-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-500" /> Novo Ticket
              </CardTitle>
              <button onClick={() => setShowForm(false)} className="text-[#888] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Título</label>
                <input
                  type="text"
                  placeholder="Descreva o problema resumidamente"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Categoria</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1a1a2e] capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Prioridade</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full cursor-pointer"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p} className="bg-[#1a1a2e] capitalize">{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Mensagem</label>
                <textarea
                  placeholder="Descreva o problema com detalhes..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={4}
                  className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-60"
              >
                {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Enviando...</> : <><MessageSquare className="w-4 h-4" /> Enviar Ticket</>}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de tickets */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 text-orange-500 animate-spin" />
          <span className="text-[#666] text-sm ml-2">Carregando tickets...</span>
        </div>
      ) : tickets.length === 0 ? (
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-10 h-10 text-[#444] mx-auto mb-3" />
            <p className="text-[#888] text-sm">Nenhum ticket ainda.</p>
            <p className="text-[#555] text-xs mt-1">Clique em "Novo Ticket" para abrir sua primeira solicitação.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Card
              key={ticket.id}
              className={`bg-white/[0.03] border-white/[0.07] cursor-pointer hover:bg-white/[0.05] transition-all ${selectedTicket?.id === ticket.id ? 'border-orange-500/40' : ''}`}
              onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{ticket.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_COLORS[ticket.status] || STATUS_COLORS.aberto}`}>
                        {STATUS_ICONS[ticket.status]} {ticket.status}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normal}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-[#666] flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {ticket.category}
                      </span>
                      <span className="text-xs text-[#666] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(ticket.created_at)}
                      </span>
                    </div>
                  </div>
                  {ticket.admin_reply && (
                    <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                      💬 Respondido
                    </span>
                  )}
                </div>

                {/* Expandido */}
                {selectedTicket?.id === ticket.id && (
                  <div className="mt-4 space-y-3 border-t border-white/[0.05] pt-4">
                    <div>
                      <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Sua mensagem</p>
                      <p className="text-sm text-[#ccc] leading-relaxed bg-white/[0.03] rounded-xl p-3">{ticket.message}</p>
                    </div>
                    {ticket.admin_reply && (
                      <div>
                        <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">✅ Resposta do suporte</p>
                        <p className="text-sm text-[#ccc] leading-relaxed bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">{ticket.admin_reply}</p>
                      </div>
                    )}
                    {!ticket.admin_reply && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                        <p className="text-xs text-yellow-400">⏳ Aguardando resposta da equipe de suporte...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
