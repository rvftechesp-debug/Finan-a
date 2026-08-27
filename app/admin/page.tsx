'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';


interface User {
  id: string;
  username: string;
  email: string;
  plan: string;
  last_access: string | null;
  role: string;
  created_at: string;
  subscription_end?: string | null;
  blocked?: boolean; // 👈 ADICIONE ESTA LINHA
}


interface Ticket {
  id: string
  user_id: string
  username: string
  email: string
  title: string
  message: string
  category: string
  priority: string
  status: string
  admin_reply: string | null
  created_at: string
  updated_at: string
}

interface AccessLog {
  id: string;
  userId: string;      // ← era user_id
  username: string | null;
  email: string;
  path: string;
  device: string;
  createdAt: string;   // ← era created_at
}


const PLANS = ['Pro', 'Plus', 'Master'];
const PLAN_LABELS: Record<string, string> = { Pro: 'PRO', Plus: 'PLUS', Master: 'MASTER' };
const AVATAR_COLORS = [
  'bg-orange-500/30 border-orange-400 text-orange-300',
  'bg-amber-500/30 border-amber-400 text-amber-300',
  'bg-yellow-500/30 border-yellow-400 text-yellow-300',
  'bg-orange-600/30 border-orange-500 text-orange-400',
  'bg-amber-600/30 border-amber-500 text-amber-400',
  'bg-red-500/30 border-red-400 text-red-300',
];

const PLAN_FEATURES: Record<string, { price: string; features: string[] }> = {
  Pro: {
    price: 'R$ 19,90/mês',
    features: ['Acesso básico', 'Até 100 lançamentos/mês', 'Suporte por email', 'Relatórios básicos'],
  },
  Plus: {
    price: 'R$ 39,90/mês',
    features: ['Acesso completo', 'Lançamentos ilimitados', 'Suporte prioritário', 'Relatórios avançados', 'Exportação de dados'],
  },
  Master: {
    price: 'R$ 79,90/mês',
    features: ['Tudo do Plus', 'API de integração', 'Suporte 24/7', 'Múltiplas contas', 'Análise IA ilimitada', 'Painel exclusivo'],
  },
};

const STATUS_COLORS_ADMIN: Record<string, string> = {
  aberto: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  'em andamento': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  resolvido: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  fechado: 'bg-gray-500/20 border-gray-500/30 text-gray-400',
}

const PRIORITY_COLORS_ADMIN: Record<string, string> = {
  baixa: 'bg-gray-500/20 text-gray-400',
  normal: 'bg-blue-500/20 text-blue-400',
  alta: 'bg-orange-500/20 text-orange-400',
  urgente: 'bg-red-500/20 text-red-400',
}

type ActiveMenu = 'dashboard' | 'usuarios' | 'planos' | 'relatorios' | 'pagamentos' | 'suporte' | 'analytics' | 'notificacoes' | 'logs' | 'aparencia' | 'emails' | 'config';

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState<{ open: boolean; userId: string; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [notification, setNotification] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifSending, setNotifSending] = useState(false);
  const [notifTarget, setNotifTarget] = useState<string>('all'); // 👈 ADICIONE ESTA LINHA
  const [searchUser, setSearchUser] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
   const [notifUserId, setNotifUserId] = useState('');
 

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)


  const toggleBlock = async (id: string, blocked: boolean) => {
  const res = await fetch('/api/admin/usuarios', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'toggle_block', blocked: !blocked }),
  });

  if (res.ok) {
    // atualiza a lista localmente
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, blocked: !blocked } : u))
    );
  } else {
    const data = await res.json();
    alert(data.error || 'Erro ao alterar bloqueio');
  }
};

  const loadUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/usuarios');
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
    setLoading(false);
  };

    const loadTickets = async () => {
    setTicketsLoading(true)
    const res = await fetch('/api/tickets')
    const data = await res.json()
    if (Array.isArray(data)) setTickets(data)
    setTicketsLoading(false)
  };

  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    const res = await fetch('/api/admin/analytics');
    const data = await res.json();
    if (Array.isArray(data)) setAccessLogs(data);
    setAnalyticsLoading(false);
  };

  useEffect(() => {
    if (activeMenu === 'analytics') loadAnalytics();
  }, [activeMenu]);

  useEffect(() => { loadUsers(); loadTickets(); }, []);

  useEffect(() => {
  if (window.innerWidth < 768) setSidebarOpen(false);
}, []);


  const changePlan = async (id: string, plan: string) => {
    await fetch('/api/admin/usuarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, plan }),
    });
    loadUsers();
  };

  const confirmPayment = async (id: string, username: string) => {
  if (!confirm(`Confirmar pagamento de ${username}? Isso renova a assinatura por 30 dias.`)) return;
  const res = await fetch('/api/admin/usuarios', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'confirm_payment' }),
  });
  if (res.ok) { alert('Pagamento confirmado!'); loadUsers(); }
  else alert('Erro ao confirmar pagamento');
};

const getVencimento = (u: User) => {
  if (!u.subscription_end) return { texto: 'Sem assinatura', cor: 'text-gray-500', vencido: false };
  const fim = new Date(u.subscription_end);
  const hoje = new Date();
  const dias = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { texto: `Vencido há ${Math.abs(dias)}d`, cor: 'text-red-400', vencido: true };
  if (dias <= 5) return { texto: `Vence em ${dias}d`, cor: 'text-yellow-400', vencido: false };
  return { texto: fim.toLocaleDateString('pt-BR'), cor: 'text-green-400', vencido: false };
};

  const resetPassword = async () => {
    if (!resetModal || !newPassword) return;
    const res = await fetch('/api/admin/usuarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resetModal.userId, password: newPassword }),
    });
    if (res.ok) { alert(`Senha de ${resetModal.username} alterada!`); setResetModal(null); setNewPassword(''); }
    else alert('Erro ao alterar senha');
  };

  const sendNotification = async () => {
  if (!notifTitle || !notification) return;
  setNotifSending(true);
  try {
    const res = await fetch('/api/admin/notificacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
  title: notifTitle,
  message: notification,
  target_plan: notifUserId ? null : notifTarget,
  target_user: notifUserId || null,
}),

    });
    if (res.ok) {
      alert('Notificação enviada!');
      setNotification('');
      setNotifTitle('');
      setNotifTarget('all');
      setNotifUserId('');
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Erro: ${err.error || res.status}`);
    }
  } catch {
    alert('Erro de conexão');
  } finally {
    setNotifSending(false);
  }
};


  const deleteUser = async (id: string, username: string) => {
    if (!confirm(`Excluir ${username}?`)) return;
    const res = await fetch(`/api/admin/usuarios?id=${id}`, { method: 'DELETE' });
    if (res.ok) loadUsers();
  };

  const logout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const formatDate = (date: string | null) => date ? new Date(date).toLocaleString('pt-BR') : 'Nunca acessou';

  const stats = {
    total: users.length,
    ativos: users.filter(u => u.last_access).length,
    premium: users.filter(u => ['Plus', 'Master'].includes(u.plan)).length,
    admins: users.filter(u => u.role === 'admin').length,
    pro: users.filter(u => u.plan === 'Pro').length,
    plus: users.filter(u => u.plan === 'Plus').length,
    master: users.filter(u => u.plan === 'Master').length,
  };

    const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );
const notifUsers = users
  .filter(u => u.role !== 'admin')
  .filter(u => notifTarget === 'all' ? true : u.plan === notifTarget);
 
  const logs = [
    { time: '10:45', action: 'Login', user: 'renan91', type: 'info' },
    { time: '10:32', action: 'Plano alterado para Plus', user: 'nick', type: 'success' },
    { time: '10:15', action: 'Senha resetada', user: 'nevi91', type: 'warning' },
    { time: '09:58', action: 'Usuário excluído', user: 'teste123', type: 'error' },
    { time: '09:30', action: 'Login admin', user: 'renan91', type: 'info' },
  ];

  const menuItems: { id: ActiveMenu; icon: string; label: string; group?: string }[] = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'usuarios', icon: '👥', label: 'Usuários', group: 'Gestão' },
    { id: 'planos', icon: '💳', label: 'Planos', group: 'Gestão' },
    { id: 'pagamentos', icon: '💰', label: 'Pagamentos', group: 'Gestão' },
    { id: 'suporte', icon: '🎫', label: 'Suporte', group: 'Gestão' },
    { id: 'relatorios', icon: '📈', label: 'Relatórios', group: 'Monitoramento' },
    { id: 'analytics', icon: '🔍', label: 'Analytics', group: 'Monitoramento' },
    { id: 'notificacoes', icon: '🔔', label: 'Notificações', group: 'Monitoramento' },
    { id: 'logs', icon: '📋', label: 'Logs', group: 'Monitoramento' },
    { id: 'aparencia', icon: '🎨', label: 'Aparência', group: 'Configurações' },
    { id: 'emails', icon: '📧', label: 'Emails', group: 'Configurações' },
    { id: 'config', icon: '⚙️', label: 'Configurações', group: 'Configurações' },
  ];

  const groups = ['', 'Gestão', 'Monitoramento', 'Configurações'];

  if (loading)
    return (
      <div className="min-h-screen bg-[#0c0a08] flex items-center justify-center">
        <div className="text-orange-400 text-lg animate-pulse">Carregando...</div>
      </div>
    );

    return (
    <div className="min-h-screen bg-[#0c0a08] text-gray-200 flex font-sans">
      {/* ===== SIDEBAR ===== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-[#12100c]/90 backdrop-blur-md border-r border-orange-500/20 flex flex-col
          w-64 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:transition-all
          ${sidebarOpen ? 'md:w-64' : 'md:w-16'}
        `}
      >
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-500/20 border-2 border-orange-400/60 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-300 font-bold">RV</span>
          </div>
          {sidebarOpen && <span className="text-orange-100 font-bold tracking-wide">RV FINANÇAS</span>}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="ml-auto text-gray-500 hover:text-orange-300 transition-colors"
          >
            <span className="md:hidden">✕</span>
            <span className="hidden md:inline">{sidebarOpen ? '◀' : '▶'}</span>
          </button>
        </div>

        <nav className="flex-1 px-2 mt-2 overflow-y-auto">
          {groups.map(group => {
            const items = menuItems.filter(i => (i.group ?? '') === group);
            return (
              <div key={group} className="mb-2">
                {group && sidebarOpen && (
                  <div className="px-3 py-1 text-[10px] font-bold text-orange-500/60 uppercase tracking-widest">{group}</div>
                )}
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-0.5 ${
                      activeMenu === item.id
                        ? 'bg-orange-500/15 border border-orange-400/40 text-orange-300'
                        : 'text-gray-400 hover:text-orange-200 hover:bg-orange-500/5'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="mx-4 h-px bg-orange-500/20 my-2" />
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/30 border border-orange-400/50 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-300 text-xs font-bold">A</span>
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">Admin</div>
              <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 transition-colors">Sair</button>
            </div>
          )}
        </div>
      </aside>

      {/* ===== OVERLAY MOBILE ===== */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* ===== MAIN ===== */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="bg-[#12100c]/80 border-b border-orange-500/20 px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-orange-300 text-xl flex-shrink-0"
            >
              ☰
            </button>
            <h1 className="text-base md:text-lg font-bold text-orange-200 flex items-center gap-2 truncate">
              {menuItems.find(m => m.id === activeMenu)?.icon}{' '}
              {menuItems.find(m => m.id === activeMenu)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-3 md:gap-4 text-center">
              <div><div className="text-lg md:text-xl font-bold text-orange-300">{stats.total}</div><div className="text-[10px] text-gray-500 uppercase">Total</div></div>
              <div><div className="text-lg md:text-xl font-bold text-green-400">{stats.ativos}</div><div className="text-[10px] text-gray-500 uppercase">Ativos</div></div>
              <div className="hidden sm:block"><div className="text-lg md:text-xl font-bold text-yellow-400">{stats.premium}</div><div className="text-[10px] text-gray-500 uppercase">Premium</div></div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-auto">

          {/* ===== DASHBOARD ===== */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Usuários', value: stats.total, icon: '👥', color: 'orange' },
                  { label: 'Ativos', value: stats.ativos, icon: '✅', color: 'green' },
                  { label: 'Premium', value: stats.premium, icon: '⭐', color: 'yellow' },
                  { label: 'Admins', value: stats.admins, icon: '🔑', color: 'red' },
                ].map(s => (
                  <div key={s.label} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-3xl font-bold text-orange-300">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-orange-300 mb-4">📊 Distribuição de Planos</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Pro', value: stats.pro, color: 'bg-blue-500' },
                      { label: 'Plus', value: stats.plus, color: 'bg-orange-500' },
                      { label: 'Master', value: stats.master, color: 'bg-yellow-500' },
                    ].map(p => (
                      <div key={p.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{p.label}</span>
                          <span className="text-gray-300">{p.value} usuários</span>
                        </div>
                        <div className="bg-white/5 rounded-full h-2">
                          <div className={`${p.color} h-2 rounded-full transition-all`}
                            style={{ width: stats.total ? `${(p.value / stats.total) * 100}%` : '0%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-orange-300 mb-4">🕐 Últimos Acessos</h3>
                  <div className="space-y-2">
                    {users.filter(u => u.last_access).slice(0, 5).map((u, i) => (
                      <div key={u.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} border flex items-center justify-center text-[10px] font-bold`}>
                            {(u.username || u.email)[0].toUpperCase()}
                          </div>
                          <span className="text-gray-300">{u.username || u.email}</span>
                        </div>
                        <span className="text-gray-500">{formatDate(u.last_access)}</span>
                      </div>
                    ))}
                    {users.filter(u => u.last_access).length === 0 && (
                      <p className="text-gray-600 text-xs">Nenhum acesso registrado</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

         {/* ===== USUÁRIOS ===== */}
{activeMenu === 'usuarios' && (
  <div className="space-y-4">
    <input
      type="text"
      placeholder="🔍 Buscar usuário ou email..."
      value={searchUser}
      onChange={e => setSearchUser(e.target.value)}
      className="w-full bg-[#16120e] border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-400"
    />
    <div className="bg-[#16120e]/90 border border-orange-500/30 rounded-2xl overflow-hidden">
      <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-3">
        <div className="grid grid-cols-12 gap-4 text-xs font-bold text-orange-300 uppercase tracking-wider">
          <div className="col-span-2">Usuário</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Plano</div>
          <div className="col-span-2">Último Acesso</div>
          <div className="col-span-1">Senha</div>
          <div className="col-span-2 text-right pr-20">Ações</div>
        </div>
      </div>
      <div className="divide-y divide-orange-500/10">
        {filteredUsers.map((user, i) => {
          const isAdmin = user.role === 'admin';
          return (
            <div key={user.id} className="px-6 py-4 hover:bg-orange-500/5 transition-all">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-2 flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} border flex items-center justify-center text-xs font-bold shrink-0`}>
                    {(user.username || user.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-200 flex items-center gap-1">
                      <span className="truncate">{user.username || '-'}</span>
                      {isAdmin && <span className="bg-red-500/20 border border-red-400/40 text-red-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0">ADMIN</span>}
                    </div>
                  </div>
                </div>
                <div className="col-span-3 text-sm text-gray-400 truncate">{user.email}</div>
                <div className="col-span-2">
                  <select
                    value={user.plan}
                    onChange={e => changePlan(user.id, e.target.value)}
                    disabled={isAdmin}
                    className={`bg-[#1e1a14] border rounded-xl px-2 py-1 text-xs font-bold uppercase appearance-none cursor-pointer ${
                      isAdmin ? 'border-gray-700 text-gray-600 cursor-not-allowed' : 'border-orange-500/30 text-orange-300'
                    }`}
                  >
                    {PLANS.map(p => <option key={p} value={p} className="bg-[#1e1a14]">{PLAN_LABELS[p]}</option>)}
                  </select>
                </div>
                <div className="col-span-2 text-xs text-gray-500">🕐 {formatDate(user.last_access)}</div>
                <div className="col-span-1">
                  <button
                    onClick={() => setResetModal({ open: true, userId: user.id, username: user.username || user.email })}
                    disabled={isAdmin}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${isAdmin ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed' : 'bg-orange-500/10 border border-orange-400/30 text-orange-300 hover:bg-orange-500/20'}`}
                  >
                    🔑 Reset
                  </button>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => deleteUser(user.id, user.username || user.email)}
                    disabled={isAdmin}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isAdmin
                        ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                        : 'bg-red-500/10 border border-red-400/30 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    🗑️ Excluir
                  </button>
                  <button
                    onClick={() => toggleBlock(user.id, user.blocked ?? false)}
                    disabled={isAdmin}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isAdmin
                        ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                        : user.blocked
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    }`}
                  >
                    {user.blocked ? '🔓 Desbloquear' : '🔒 Bloquear'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filteredUsers.length === 0 && <div className="p-10 text-center text-gray-500">Nenhum usuário encontrado.</div>}
    </div>
  </div>
)}


          {/* ===== PLANOS ===== */}
          {activeMenu === 'planos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(PLAN_FEATURES).map(([plan, info]) => (
                <div key={plan} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-orange-300">{PLAN_LABELS[plan]}</h3>
                    <span className="text-xs bg-orange-500/20 border border-orange-400/30 text-orange-300 px-3 py-1 rounded-full font-bold">
                      {users.filter(u => u.plan === plan).length} usuários
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">{info.price}</div>
                  <ul className="space-y-2">
                    {info.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="text-green-400">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-orange-500/10">
                    <div className="text-xs text-gray-500">Receita estimada</div>
                    <div className="text-orange-300 font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        users.filter(u => u.plan === plan).length * parseFloat(info.price.replace('R$ ', '').replace('/mês', '').replace(',', '.'))
                      )}/mês
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===== PAGAMENTOS ===== */}
{activeMenu === 'pagamentos' && (() => {
  const pagantes = users.filter(u => u.role !== 'admin');
  const inadimplentes = pagantes.filter(u => getVencimento(u).vencido);
  const precos: Record<string, number> = { Pro: 19.9, Plus: 39.9, Master: 79.9 };
  const receita = pagantes
    .filter(u => !getVencimento(u).vencido && u.subscription_end)
    .reduce((acc, u) => acc + (precos[u.plan] || 0), 0);
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Receita Mensal', value: fmt(receita), icon: '💰' },
          { label: 'Assinaturas Ativas', value: pagantes.filter(u => !getVencimento(u).vencido && u.subscription_end).length, icon: '📋' },
          { label: 'Inadimplentes', value: inadimplentes.length, icon: '⚠️' },
        ].map(s => (
          <div key={s.label} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold text-orange-300">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl overflow-hidden">
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-3">
          <h3 className="text-sm font-bold text-orange-300">💳 Controle de Assinaturas</h3>
        </div>

        {pagantes.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-sm">Nenhum usuário pagante.</p>
          </div>
        ) : (
          <>
            <div className="bg-orange-500/5 border-b border-orange-500/10 px-6 py-2.5">
              <div className="grid grid-cols-12 gap-4 text-xs font-bold text-orange-300 uppercase tracking-wider">
                <div className="col-span-3">Usuário</div>
                <div className="col-span-2">Plano</div>
                <div className="col-span-2">Valor</div>
                <div className="col-span-3">Vencimento</div>
                <div className="col-span-2 text-right">Ação</div>
              </div>
            </div>
            <div className="divide-y divide-orange-500/10">
              {pagantes.map((u, i) => {
                const venc = getVencimento(u);
                return (
                  <div key={u.id} className="px-6 py-4 hover:bg-orange-500/5 transition-all">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} border flex items-center justify-center text-xs font-bold`}>
                          {(u.username || u.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-200 truncate">{u.username || '-'}</div>
                          <div className="text-[10px] text-gray-500 truncate">{u.email}</div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs font-bold uppercase text-orange-300">{PLAN_LABELS[u.plan] || u.plan}</span>
                      </div>
                      <div className="col-span-2 text-sm text-gray-300">{fmt(precos[u.plan] || 0)}</div>
                      <div className="col-span-3">
                        <span className={`text-xs font-medium ${venc.cor}`}>
                          {venc.vencido && '⚠️ '}{venc.texto}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => confirmPayment(u.id, u.username || u.email)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 border border-green-400/30 text-green-400 hover:bg-green-500/20 transition-all"
                        >
                          ✅ Confirmar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
})()}

          {/* ===== SUPORTE (com dados reais) ===== */}
          {activeMenu === 'suporte' && (
            <AdminSuporteSection tickets={tickets} ticketsLoading={ticketsLoading} loadTickets={loadTickets} />
          )}

          
          {/* ===== RELATÓRIOS ===== */}
{activeMenu === 'relatorios' && (() => {
  const naoAdmin = users.filter(u => u.role !== 'admin');
  const total = naoAdmin.length;
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  // Novos usuários no mês corrente
  const novosMes = naoAdmin.filter(u => {
    const d = new Date(u.created_at);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  }).length;

  // Ativos últimos 30 dias (retenção aproximada)
  const trintaDias = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ativos30 = naoAdmin.filter(u => u.last_access && new Date(u.last_access) >= trintaDias).length;
  const retencao = total ? Math.round((ativos30 / total) * 100) : 0;

  // Churn aproximado: assinaturas vencidas / total com assinatura
  const comAssinatura = naoAdmin.filter(u => u.subscription_end);
  const vencidos = comAssinatura.filter(u => new Date(u.subscription_end!) < agora).length;
  const churn = comAssinatura.length ? Math.round((vencidos / comAssinatura.length) * 100) : 0;

  // Crescimento por mês (últimos 6 meses)
  const meses: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(anoAtual, mesAtual - i, 1);
    const label = ref.toLocaleDateString('pt-BR', { month: 'short' });
    const count = naoAdmin.filter(u => {
      const d = new Date(u.created_at);
      return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
    }).length;
    meses.push({ label, count });
  }
  const maxMes = Math.max(...meses.map(m => m.count), 1);

  const cards = [
    { label: 'Novos este mês', value: novosMes, icon: '👥' },
    { label: 'Taxa de retenção', value: `${retencao}%`, icon: '📈' },
    { label: 'Churn rate', value: `${churn}%`, icon: '📉' },
    { label: 'Ativos (30d)', value: ativos30, icon: '⚡' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(s => (
          <div key={s.label} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-3xl font-bold text-orange-300">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de crescimento (últimos 6 meses) */}
      <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-orange-300 mb-4">📊 Novos Usuários (últimos 6 meses)</h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {meses.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
              <span className="text-xs text-gray-400">{m.count}</span>
              <div
                className="w-full bg-orange-500/60 hover:bg-orange-400 rounded-t-lg transition-all"
                style={{ height: `${(m.count / maxMes) * 100}%`, minHeight: m.count ? '4px' : '0' }}
              />
              <span className="text-[10px] text-gray-500 uppercase">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de cadastros */}
      <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-orange-300 mb-4">🗓️ Histórico de Cadastros</h3>
        <div className="space-y-2 max-h-72 overflow-auto">
          {naoAdmin
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map(u => (
              <div key={u.id} className="flex items-center justify-between text-xs py-2 border-b border-orange-500/10">
                <span className="text-gray-400">{u.username || u.email}</span>
                <span className="text-gray-500">{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  u.plan === 'Master' ? 'bg-yellow-500/20 text-yellow-300' :
                  u.plan === 'Plus' ? 'bg-orange-500/20 text-orange-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {u.plan}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
})()}

                    {/* ===== ANALYTICS ===== */}
{activeMenu === 'analytics' && (() => {
  const hoje = new Date().toDateString();
  const sessoesHoje = accessLogs.filter(l => new Date(l.createdAt).toDateString() === hoje).length;
  const usuariosUnicos = new Set(accessLogs.map(l => l.userId)).size;

  // Dispositivos
  const devices = accessLogs.reduce((acc, l) => {
    acc[l.device] = (acc[l.device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Páginas mais acessadas
  const paginas = accessLogs.reduce((acc, l) => {
    acc[l.path] = (acc[l.path] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topPaginas = Object.entries(paginas).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxPagina = topPaginas[0]?.[1] || 1;

  const cards = [
    { label: 'Acessos hoje', value: sessoesHoje, icon: '👁️' },
    { label: 'Usuários únicos (30d)', value: usuariosUnicos, icon: '🧑' },
    { label: 'Total de acessos (30d)', value: accessLogs.length, icon: '📊' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(s => (
          <div key={s.label} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-3xl font-bold text-orange-300">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dispositivos */}
        <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-orange-300 mb-4">📱 Dispositivos</h3>
          <div className="space-y-3">
            {Object.entries(devices).length === 0 && (
              <p className="text-gray-600 text-xs">Sem dados ainda.</p>
            )}
            {Object.entries(devices).map(([dev, count]) => (
              <div key={dev}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{dev}</span>
                  <span className="text-gray-300">{count}</span>
                </div>
                <div className="bg-white/5 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${(count / accessLogs.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Páginas mais acessadas */}
        <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-orange-300 mb-4">🔥 Páginas mais acessadas</h3>
          <div className="space-y-3">
            {topPaginas.length === 0 && (
              <p className="text-gray-600 text-xs">Sem dados ainda.</p>
            )}
            {topPaginas.map(([path, count]) => (
              <div key={path}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400 truncate">{path}</span>
                  <span className="text-gray-300">{count}</span>
                </div>
                <div className="bg-white/5 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${(count / maxPagina) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Últimos acessos */}
      <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl overflow-hidden">
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-3">
          <h3 className="text-sm font-bold text-orange-300">🕐 Acessos Recentes</h3>
        </div>
        {analyticsLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
        ) : accessLogs.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm">Nenhum acesso registrado ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-orange-500/10 max-h-80 overflow-auto">
            {accessLogs.slice(0, 30).map(l => (
              <div key={l.id} className="px-6 py-3 flex items-center gap-4 text-xs">
                <span className="text-gray-300">{l.username || l.email}</span>
                <span className="text-gray-500">{l.path}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{l.device}</span>
                <span className="text-gray-600 ml-auto">
                  {new Date(l.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
})()}

          {/* ===== NOTIFICAÇÕES ===== */}
{activeMenu === 'notificacoes' && (
  <div className="space-y-4">
    <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-orange-300">🔔 Enviar Notificação para Usuários</h3>

      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Título</label>
        <input
          type="text"
          value={notifTitle}
          onChange={e => setNotifTitle(e.target.value)}
          placeholder="Ex: Manutenção programada"
          className="w-full bg-[#1e1a14] border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-400"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Mensagem</label>
        <textarea
          value={notification}
          onChange={e => setNotification(e.target.value)}
          placeholder="Digite a mensagem para os usuários..."
          rows={4}
          className="w-full bg-[#1e1a14] border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-400 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Filtro de Plano */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Plano</label>
          <select
            value={notifTarget}
            onChange={e => { setNotifTarget(e.target.value); setNotifUserId(''); }}
            className="w-full bg-[#1e1a14] border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-400"
          >
            <option value="all">Todos os usuários ({stats.total})</option>
            <option value="Pro">Apenas Pro ({stats.pro})</option>
            <option value="Plus">Apenas Plus ({stats.plus})</option>
            <option value="Master">Apenas Master ({stats.master})</option>
          </select>
        </div>

        {/* Filtro de Usuário específico */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Usuário específico (opcional)</label>
          <select
            value={notifUserId}
            onChange={e => setNotifUserId(e.target.value)}
            className="w-full bg-[#1e1a14] border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-400"
          >
            <option value="">— Enviar para todos deste filtro ({notifUsers.length}) —</option>
            {notifUsers.map(u => (
              <option key={u.id} value={u.id}>
               {u.username || u.email}
                  </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={sendNotification}
        disabled={notifSending || !notifTitle || !notification}
        className="bg-orange-500 text-[#1a1208] font-bold px-6 py-2.5 rounded-xl hover:bg-orange-400 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {notifSending ? '⏳ Enviando...' : '📨 Enviar Notificação'}
      </button>
    </div>
  </div>
)}

          {/* ===== LOGS ===== */}
          {activeMenu === 'logs' && (
            <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl overflow-hidden">
              <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-orange-300">📋 Logs do Sistema</h3>
                <span className="text-xs text-gray-500">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="divide-y divide-orange-500/10 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="px-6 py-3 flex items-center gap-4 hover:bg-orange-500/5">
                    <span className="text-gray-600">{log.time}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.type === 'info' ? 'bg-blue-500/20 text-blue-300' :
                      log.type === 'success' ? 'bg-green-500/20 text-green-300' :
                      log.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>{log.type.toUpperCase()}</span>
                    <span className="text-gray-400">{log.action}</span>
                    <span className="text-orange-400 ml-auto">@{log.user}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== APARÊNCIA ===== */}
          {activeMenu === 'aparencia' && (
            <div className="space-y-4">
              <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-orange-300">🎨 Personalização Visual</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Cor Principal</label>
                    <div className="flex gap-2 flex-wrap">
                      {['#F97316', '#8B5CF6', '#10B981', '#3B82F6', '#EC4899', '#EF4444'].map(c => (
                        <button key={c} className="w-8 h-8 rounded-full border-2 border-white/20 hover:border-white/60 transition-all" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Tema</label>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg text-xs bg-orange-500/20 border border-orange-400/40 text-orange-300 font-medium">🌙 Dark</button>
                      <button className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-gray-400">☀️ Light</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Nome do App</label>
                  <input type="text" defaultValue="RV Finanças" className="bg-[#1e1a14] border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-400 w-full max-w-xs" />
                </div>
                <button className="bg-orange-500 text-[#1a1208] font-bold px-6 py-2.5 rounded-xl hover:bg-orange-400 transition-all text-sm">
                  💾 Salvar Aparência
                </button>
              </div>
            </div>
          )}

          {/* ===== EMAILS ===== */}
          {activeMenu === 'emails' && (
            <div className="space-y-4">
              <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-orange-300">📧 Templates de Email</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: 'Boas-vindas', desc: 'Enviado ao criar conta', status: 'ativo' },
                    { name: 'Reset de Senha', desc: 'Enviado ao solicitar nova senha', status: 'ativo' },
                    { name: 'Upgrade de Plano', desc: 'Confirmação de mudança de plano', status: 'inativo' },
                    { name: 'Aviso de Vencimento', desc: 'Lembrete de pagamento', status: 'inativo' },
                  ].map(t => (
                    <div key={t.name} className="bg-[#1e1a14] border border-orange-500/10 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-200">{t.name}</div>
                        <div className="text-xs text-gray-500">{t.desc}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.status === 'ativo' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500'}`}>
                          {t.status}
                        </span>
                        <button className="text-xs text-orange-400 hover:text-orange-300">Editar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

                            {/* ===== CONFIG ===== */}
          {activeMenu === 'config' && (
            <div className="space-y-4">
              <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-orange-300">⚙️ Configurações Gerais</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Manutenção', desc: 'Bloquear acesso de usuários', enabled: false },
                    { label: 'Cadastros', desc: 'Permitir novos cadastros', enabled: true },
                    { label: 'Emails automáticos', desc: 'Enviar emails transacionais', enabled: true },
                    { label: 'Modo debug', desc: 'Exibir logs detalhados', enabled: false },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between p-4 bg-[#1e1a14] border border-orange-500/10 rounded-xl">
                      <div>
                        <div className="text-sm font-medium text-gray-200">{s.label}</div>
                        <div className="text-xs text-gray-500">{s.desc}</div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative cursor-pointer ${s.enabled ? 'bg-orange-500' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${s.enabled ? 'left-5' : 'left-0.5'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Keys */}
              <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6 space-y-3">
                <h3 className="text-sm font-bold text-orange-300">🔑 API Keys</h3>
                {[
                  { name: 'Supabase URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL || '••••••••' },
                  { name: 'Anon Key', value: '••••••••••••••••••••' },
                ].map(k => (
                  <div key={k.name} className="flex items-center justify-between p-3 bg-[#1e1a14] border border-orange-500/10 rounded-xl">
                    <span className="text-xs text-gray-500">{k.name}</span>
                    <span className="text-xs font-mono text-gray-400">{k.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
       
          {/* ===== MODAL RESETAR SENHA ===== */}
      {resetModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setResetModal(null)} />
          <div className="relative bg-[#1e1a14] border border-orange-500/40 rounded-2xl w-full max-w-md mx-4">
            <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-4">
              <h3 className="text-lg font-bold text-orange-300">🔐 Resetar Senha</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs text-gray-500 uppercase">Usuário</div>
                <div className="text-white font-medium">{resetModal.username}</div>
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nova senha"
                autoFocus
                className="w-full bg-[#16120e] border border-orange-500/30 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-400"
              />
              <div className="flex gap-3">
                <button onClick={() => { setResetModal(null); setNewPassword(''); }} className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800/50">Cancelar</button>
                <button onClick={resetPassword} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-[#1a1208] font-bold hover:bg-orange-400">💾 Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== SEÇÃO DE SUPORTE (ADMIN) ==========

function AdminSuporteSection({
  tickets,
  ticketsLoading,
  loadTickets,
}: {
  tickets: Ticket[]
  ticketsLoading: boolean
  loadTickets: () => void
}) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [adminReply, setAdminReply] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)

  const handleReply = async (ticketId: string, status: string) => {
    setReplyLoading(true)
    const res = await fetch('/api/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ticketId, admin_reply: adminReply, status }),
    })
    if (res.ok) {
      setSelectedTicket(null)
      setAdminReply('')
      loadTickets()
    }
    setReplyLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este ticket?')) return
    await fetch(`/api/tickets?id=${id}`, { method: 'DELETE' })
    loadTickets()
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const openCount = tickets.filter(t => t.status === 'aberto').length
  const inProgressCount = tickets.filter(t => t.status === 'em andamento').length
  const resolvedCount = tickets.filter(t => t.status === 'resolvido').length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Abertos', value: openCount, color: 'text-yellow-400' },
          { label: 'Em andamento', value: inProgressCount, color: 'text-blue-400' },
          { label: 'Resolvidos', value: resolvedCount, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Lista de tickets */}
      <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl overflow-hidden">
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-orange-300">🎫 Tickets de Suporte</h3>
          <span className="text-xs text-gray-500">{tickets.length} total</span>
        </div>

        {ticketsLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-sm">Nenhum ticket aberto.</p>
          </div>
        ) : (
          <div className="divide-y divide-orange-500/10">
            {tickets.map(ticket => (
              <div key={ticket.id} className="p-4 hover:bg-orange-500/5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-gray-200">{ticket.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_COLORS_ADMIN[ticket.status] || STATUS_COLORS_ADMIN.aberto}`}>
                        {ticket.status}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${PRIORITY_COLORS_ADMIN[ticket.priority] || ''}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>👤 {ticket.username || ticket.email}</span>
                      <span>🏷️ {ticket.category}</span>
                      <span>🕐 {formatDate(ticket.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket); setAdminReply(ticket.admin_reply || '') }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-orange-500/10 border border-orange-400/30 text-orange-300 hover:bg-orange-500/20"
                    >
                      💬 Responder
                    </button>
                    <button
                      onClick={() => handleDelete(ticket.id)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 border border-red-400/30 text-red-400 hover:bg-red-500/20"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Mensagem do usuário */}
                <div className="mt-2 text-xs text-gray-500 bg-white/5 rounded-lg p-3">
                  {ticket.message}
                </div>

                {/* Painel de resposta */}
                {selectedTicket?.id === ticket.id && (
                  <div className="mt-3 space-y-3 border-t border-orange-500/10 pt-3">
                    {ticket.admin_reply && (
                      <div className="text-xs text-gray-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                        <span className="text-emerald-400 font-bold block mb-1">✅ Resposta atual:</span>
                        {ticket.admin_reply}
                      </div>
                    )}
                    <textarea
                      value={adminReply}
                      onChange={e => setAdminReply(e.target.value)}
                      placeholder="Digite sua resposta..."
                      rows={3}
                      className="w-full bg-[#1e1a14] border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReply(ticket.id, 'em andamento')}
                        disabled={replyLoading || !adminReply}
                        className="px-4 py-2 rounded-xl text-xs bg-blue-500/20 border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 disabled:opacity-50"
                      >
                        🔵 Em andamento
                      </button>
                      <button
                        onClick={() => handleReply(ticket.id, 'resolvido')}
                        disabled={replyLoading || !adminReply}
                        className="px-4 py-2 rounded-xl text-xs bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        ✅ Resolver
                      </button>
                      <button
                        onClick={() => handleReply(ticket.id, 'fechado')}
                        disabled={replyLoading}
                        className="px-4 py-2 rounded-xl text-xs bg-gray-500/20 border border-gray-400/30 text-gray-400 hover:bg-gray-500/30 disabled:opacity-50"
                      >
                        ⛔ Fechar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
