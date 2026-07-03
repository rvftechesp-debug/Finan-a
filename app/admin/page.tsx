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

const PLAN_LABELS: Record<string, string> = {
  Pro: 'PRO',
  Plus: 'PLUS',
  Master: 'MASTER',
};

const PLAN_COLORS: Record<string, string> = {
  Pro: 'from-blue-500/20 to-cyan-500/20 border-blue-400/40 text-blue-300',
  Plus: 'from-orange-500/20 to-amber-500/20 border-orange-400/40 text-orange-300',
  Master: 'from-yellow-500/20 to-amber-400/20 border-yellow-400/40 text-yellow-300',
};

const AVATAR_COLORS = [
  'bg-orange-500/30 border-orange-400 text-orange-300',
  'bg-amber-500/30 border-amber-400 text-amber-300',
  'bg-yellow-500/30 border-yellow-400 text-yellow-300',
  'bg-orange-600/30 border-orange-500 text-orange-400',
  'bg-amber-600/30 border-amber-500 text-amber-400',
  'bg-red-500/30 border-red-400 text-red-300',
];

export default function AdminPage() {
  const router = useRouter();

  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []
  );

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState<{
    open: boolean;
    userId: string;
    username: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [activeMenu, setActiveMenu] = useState('usuarios');

const loadUsers = async () => {
    setLoading(true);
    console.log('🔵 loadUsers chamado');
    
    const res = await fetch('/api/admin/usuarios');
    console.log('🟡 status da resposta:', res.status);
    
    const data = await res.json();
    console.log('🟢 data recebido:', data);

    if (Array.isArray(data)) {
      console.log('✅ plans:', data.map(u => u.plan));
      setUsers(data);
    } else {
      console.log('❌ data não é array:', data);
    }
    setLoading(false);
  };


useEffect(() => {
  loadUsers();
}, []);

   const changePlan = async (id: string, plan: string) => {
  const res = await fetch('/api/admin/usuarios', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, plan }),
  });
  if (res.ok) loadUsers();
};


  const resetPassword = async () => {
    if (!resetModal || !newPassword) return;

    const res = await fetch('/api/admin/usuarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resetModal.userId, password: newPassword }),
    });

    if (res.ok) {
      alert(`Senha de ${resetModal.username} alterada com sucesso!`);
      setResetModal(null);
      setNewPassword('');
    } else {
      alert('Erro ao alterar senha');
    }
  };

  const deleteUser = async (id: string, username: string) => {
    if (!confirm(`Tem certeza que deseja excluir ${username}?`)) return;

    const res = await fetch(`/api/admin/usuarios?id=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) loadUsers();
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca acessou';
    return new Date(date).toLocaleString('pt-BR');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const stats = {
  total: users.length,
  ativos: users.filter((u) => u.role !== 'admin').length,
  premium: users.filter((u) => ['Plus', 'Master', 'Pro'].includes(u.plan)).length,
};


  if (loading)
    return (
      <div className="min-h-screen bg-[#0c0a08] flex items-center justify-center">
        <div className="text-orange-400 text-lg animate-pulse">Carregando usuários...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0c0a08] text-gray-200 flex font-sans">
      {/* ========== SIDEBAR ========== */}
      <aside className="w-64 bg-[#12100c]/90 backdrop-blur-md border-r border-orange-500/20 flex flex-col relative">
        {/* Logo */}
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 border-2 border-orange-400/60 flex items-center justify-center">
            <span className="text-orange-300 font-bold text-lg">RV</span>
          </div>
          <span className="text-orange-100 font-bold tracking-wide">RV FINANÇAS</span>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'usuarios', icon: '👥', label: 'Usuários' },
            { id: 'planos', icon: '📦', label: 'Planos' },
            { id: 'config', icon: '⚙️', label: 'Configurações' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeMenu === item.id
                  ? 'bg-orange-500/15 border border-orange-400/40 text-orange-300 shadow-[0_0_15px_rgba(255,140,0,0.15)]'
                  : 'text-gray-400 hover:text-orange-200 hover:bg-orange-500/5'
              }`}
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-6 h-px bg-orange-500/20 my-4" />

        {/* Admin Profile */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-500/30 border border-orange-400/50 flex items-center justify-center">
            <span className="text-orange-300 text-sm font-bold">A</span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-200">Admin</div>
            <div className="text-xs text-gray-500">admin@rv.com</div>
          </div>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-[70px] bg-[#191410]/80 backdrop-blur-md border-b border-orange-500/20 flex items-center justify-between px-8">
          <h1 className="text-2xl font-bold text-orange-50 tracking-tight">
            👥 Gerenciamento de Usuários
          </h1>

          {/* Stats Cards */}
          <div className="flex gap-4">
            {[
              { value: stats.total, label: 'Total Users', color: 'orange' },
              { value: stats.ativos, label: 'Ativos', color: 'amber' },
              { value: stats.premium, label: 'Premium', color: 'yellow' },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-[#1e1a14]/80 backdrop-blur border border-orange-500/20 rounded-lg px-4 py-2 min-w-[100px]"
              >
                <div className="text-orange-300 font-bold text-lg">{stat.value}</div>
                <div className="text-gray-500 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-orange-500/10 rounded-2xl blur-xl" />

            <div className="relative bg-[#16120e]/90 backdrop-blur-xl border border-orange-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(255,140,0,0.08)]">
              {/* Table Header */}
              <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-4">
                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-orange-300 uppercase tracking-wider">
                  <div className="col-span-2">Usuário</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2">Plano</div>
                  <div className="col-span-2">Último Acesso</div>
                  <div className="col-span-1">Senha</div>
                  <div className="col-span-2 text-right">Ações</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-orange-500/10">
                {users.map((user, i) => {
                  const isAdmin = user.role === 'admin';
                  const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];

                  return (
                    <div
                      key={user.id}
                      className="px-6 py-4 hover:bg-orange-500/5 transition-all duration-300 group"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Usuário */}
                        <div className="col-span-2 flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full ${avatarColor} border flex items-center justify-center text-sm font-bold`}
                          >
                            {(user.username || user.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-200 flex items-center gap-2">
                              {user.username || '-'}
                              {isAdmin && (
                                <span className="bg-red-500/20 border border-red-400/40 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                  ADMIN
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="col-span-3 text-sm text-gray-400 truncate">
                          {user.email}
                        </div>

                        {/* Plano */}
                        <div className="col-span-2">
                          <select
                            value={user.plan}
                            onChange={(e) => changePlan(user.id, e.target.value)}
                            disabled={isAdmin}
                            className={`bg-[#1e1a14] border rounded-xl px-3 py-1.5 text-xs font-bold uppercase appearance-none cursor-pointer transition-all ${
                              isAdmin
                                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                                : 'border-orange-500/30 text-orange-300 hover:border-orange-400/60 focus:border-orange-400 focus:shadow-[0_0_10px_rgba(255,140,0,0.2)]'
                            }`}
                          >
                            {PLANS.map((p) => (
                              <option key={p} value={p} className="bg-[#1e1a14] text-gray-300">
                                {PLAN_LABELS[p]}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Último Acesso */}
                        <div className="col-span-2 text-xs text-gray-500 flex items-center gap-2">
                          <span>🕐</span>
                          {formatDate(user.last_access)}
                        </div>

                        {/* Senha - Reset */}
                        <div className="col-span-1">
                          <button
                            onClick={() =>
                              setResetModal({
                                open: true,
                                userId: user.id,
                                username: user.username || user.email,
                              })
                            }
                            disabled={isAdmin}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isAdmin
                                ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                                : 'bg-orange-500/10 border border-orange-400/30 text-orange-300 hover:bg-orange-500/20 hover:border-orange-400/60 hover:shadow-[0_0_10px_rgba(255,140,0,0.15)]'
                            }`}
                          >
                            🔑 Reset
                          </button>
                        </div>

                        {/* Ações - Excluir */}
                        <div className="col-span-2 text-right">
                          <button
                            onClick={() => deleteUser(user.id, user.username || user.email)}
                            disabled={isAdmin}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                              isAdmin
                                ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                                : 'bg-red-500/10 border border-red-400/30 text-red-400 hover:bg-red-500/20 hover:border-red-400/60 hover:shadow-[0_0_10px_rgba(255,60,60,0.15)]'
                            }`}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {users.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  Nenhum usuário encontrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ========== MODAL RESETAR SENHA ========== */}
      {resetModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setResetModal(null)}
          />

          {/* Modal */}
          <div className="relative bg-[#1e1a14] border border-orange-500/40 rounded-2xl shadow-[0_0_60px_rgba(255,140,0,0.15)] w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-4">
              <h3 className="text-lg font-bold text-orange-300 flex items-center gap-2">
                🔐 RESETAR SENHA
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Usuário</div>
                <div className="text-white font-medium">{resetModal.username}</div>
              </div>

              <div className="relative">
                <label className="absolute -top-2 left-3 bg-[#1e1a14] px-1 text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  autoFocus
                  className="w-full bg-[#16120e] border border-orange-500/30 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-400 focus:shadow-[0_0_15px_rgba(255,140,0,0.2)] transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setResetModal(null);
                    setNewPassword('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800/50 hover:text-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={resetPassword}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-[#1a1208] font-bold hover:bg-orange-400 transition-all shadow-[0_0_20px_rgba(255,140,0,0.3)] hover:shadow-[0_0_30px_rgba(255,140,0,0.5)]"
                >
                  💾 Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
