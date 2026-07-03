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
  const [searchUser, setSearchUser] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/usuarios');
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const changePlan = async (id: string, plan: string) => {
    await fetch('/api/admin/usuarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, plan }),
    });
    loadUsers();
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

  // Simulação de logs
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
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-[#12100c]/90 backdrop-blur-md border-r border-orange-500/20 flex flex-col transition-all duration-300`}>
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-500/20 border-2 border-orange-400/60 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-300 font-bold">RV</span>
          </div>
          {sidebarOpen && <span className="text-orange-100 font-bold tracking-wide">RV FINANÇAS</span>}
          <button onClick={() => setSidebarOpen(v => !v)} className="ml-auto text-gray-500 hover:text-orange-300 transition-colors">
            {sidebarOpen ? '◀' : '▶'}
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
                    onClick={() => setActiveMenu(item.id)}
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

      {/* ===== MAIN ===== */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#12100c]/80 border-b border-orange-500/20 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-orange-200 flex items-center gap-2">
            {menuItems.find(m => m.id === activeMenu)?.icon}{' '}
            {menuItems.find(m => m.id === activeMenu)?.label}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-center">
              <div><div className="text-xl font-bold text-orange-300">{stats.total}</div><div className="text-[10px] text-gray-500 uppercase">Total</div></div>
              <div><div className="text-xl font-bold text-green-400">{stats.ativos}</div><div className="text-[10px] text-gray-500 uppercase">Ativos</div></div>
              <div><div className="text-xl font-bold text-yellow-400">{stats.premium}</div><div className="text-[10px] text-gray-500 uppercase">Premium</div></div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">

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
                    <div className="col-span-2 text-right">Ações</div>
                  </div>
                </div>
                <div className="divide-y divide-orange-500/10">
                  {filteredUsers.map((user, i) => {
                    const isAdmin = user.role === 'admin';
                    return (
                      <div key={user.id} className="px-6 py-4 hover:bg-orange-500/5 transition-all">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-2 flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} border flex items-center justify-center text-xs font-bold`}>
                              {(user.username || user.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-200 flex items-center gap-1">
                                {user.username || '-'}
                                {isAdmin && <span className="bg-red-500/20 border border-red-400/40 text-red-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
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
                          <div className="col-span-2 text-right">
                            <button
                              onClick={() => deleteUser(user.id, user.username || user.email)}
                              disabled={isAdmin}
                              className={`px-2 py-1 rounded-lg text-xs ${isAdmin ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed' : 'bg-red-500/10 border border-red-400/30 text-red-400 hover:bg-red-500/20'}`}
                            >
                              🗑️ Excluir
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
          {activeMenu === 'pagamentos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Receita Mensal', value: 'R$ 0,00', icon: '💰' },
                  { label: 'Assinaturas Ativas', value: stats.total, icon: '📋' },
                  { label: 'Inadimplentes', value: '0', icon: '⚠️' },
                ].map(s => (
                  <div key={s.label} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-2xl font-bold text-orange-300">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-orange-300 mb-4">💳 Histórico de Pagamentos</h3>
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-3">💳</div>
                  <p className="text-sm">Nenhum pagamento registrado ainda.</p>
                  <p className="text-xs text-gray-600 mt-1">Integre com Stripe ou PagSeguro para ver pagamentos aqui.</p>
                </div>
              </div>
            </div>
          )}

          {/* ===== SUPORTE ===== */}
          {activeMenu === 'suporte' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Tickets Abertos', value: '0', icon: '🎫', color: 'text-yellow-400' },
                  { label: 'Resolvidos', value: '0', icon: '✅', color: 'text-green-400' },
                  { label: 'Pendentes', value: '0', icon: '⏳', color: 'text-orange-400' },
                ].map(s => (
                  <div key={s.label} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-orange-300 mb-4">🎫 Tickets de Suporte</h3>
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-sm">Nenhum ticket aberto.</p>
                  <p className="text-xs text-gray-600 mt-1">Todos os usuários estão satisfeitos!</p>
                </div>
              </div>
            </div>
          )}

          {/* ===== RELATÓRIOS ===== */}
          {activeMenu === 'relatorios' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Usuários este mês', value: users.filter(u => new Date(u.created_at).getMonth() === new Date().getMonth()).length, icon: '👥' },
                  { label: 'Taxa de retenção', value: '—', icon: '📈' },
                  { label: 'Churn rate', value: '—', icon: '📉' },
                  { label: 'NPS Score', value: '—', icon: '⭐' },
                ].map(s => (
                  <div key={s.label} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-3xl font-bold text-orange-300">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-orange-300 mb-4">📊 Crescimento de Usuários</h3>
                <div className="space-y-2">
                  {users.map((u, i) => (
                    <div key={u.id} className="flex items-center justify-between text-xs py-2 border-b border-orange-500/10">
                      <span className="text-gray-400">{u.username || u.email}</span>
                      <span className="text-gray-500">{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.plan === 'Master' ? 'bg-yellow-500/20 text-yellow-300' : u.plan === 'Plus' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {u.plan}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== ANALYTICS ===== */}
          {activeMenu === 'analytics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Sessões hoje', value: '—', icon: '👁️' },
                  { label: 'Tempo médio', value: '—', icon: '⏱️' },
                  { label: 'Taxa de rejeição', value: '—', icon: '↩️' },
                ].map(s => (
                  <div key={s.label} className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-5">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-3xl font-bold text-orange-300">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#16120e]/90 border border-orange-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-orange-300 mb-4">🔍 Analytics Detalhado</h3>
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-sm">Integre com Google Analytics ou Vercel Analytics.</p>
                  <p className="text-xs text-gray-600 mt-1">Dados de sessão, dispositivos e páginas mais acessadas aparecerão aqui.</p>
                </div>
              </div>
            </div>
          )}

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
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Destinatários</label>
                  <select className="bg-[#1e1a14] border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-400">
                    <option>Todos os usuários ({stats.total})</option>
                    <option>Apenas Pro ({stats.pro})</option>
                    <option>Apenas Plus ({stats.plus})</option>
                    <option>Apenas Master ({stats.master})</option>
                  </select>
                </div>
                <button
                  onClick={() => { setNotifSending(true); setTimeout(() => { setNotifSending(false); alert('Notificação enviada! (simulação)'); setNotification(''); setNotifTitle(''); }, 1500); }}
                  disabled={!notification || !notifTitle || notifSending}
                  className="bg-orange-500 text-[#1a1208] font-bold px-6 py-2.5 rounded-xl hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {notifSending ? '⏳ Enviando...' : '🚀 Enviar Notificação'}
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
