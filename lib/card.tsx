"use client";

import { useState, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, CartesianGrid, LineChart, Line
} from "recharts";
import {
  Wallet, Plus, X, Pencil, Check, Lightbulb, Trash2,
  TrendingUp, TrendingDown, Target, BarChart3, PieChart as PieIcon,
  Receipt, CalendarDays, ChevronRight, AlertTriangle, CheckCircle2,
  PiggyBank, LogIn, UserPlus, LogOut, Eye, EyeOff, Lock, User, Mail,
  PlusCircle, DollarSign, Settings, KeyRound, ShieldCheck, TrendingUpIcon, Zap, Loader,
  FileText, Printer, Paperclip, Phone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFinance, CATEGORIES, MONTHS } from "@/app/hooks/useFinance";
import { useInvestments } from "@/app/hooks/useInvestments";
import { formatBRL } from "@/app/utils/investmentUtils";
import { compressImage, formatFileSize } from "@/app/utils/imageCompression";
import type { Expense } from "@/app/types";
import { supabase } from '@/lib/supabase'



// ===================== AUTH SYSTEM =====================

// ✅ SUBSTITUA a interface User por:
interface User {
  id: string;
  name: string;
  phone: string;
  username: string;
  photo?: string;
  // ⚠️ password removido — fica só no Supabase Auth
}


function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}


// ===================== AUTH SCREEN =====================

function AuthScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regConfirmPhone, setRegConfirmPhone] = useState("");

  // ✅ Login com Supabase
  // O username é usado como "email fake": username@rvfinanca.app
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginUser.trim() || !loginPass.trim()) {
      setError("Preencha usuário e senha");
      return;
    }

    setLoading(true);
    try {
      const fakeEmail = `${loginUser.trim().toLowerCase()}@rvfinanca.app`;

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: loginPass.trim(),
      });

      if (authError || !data.user) {
        setError("Usuário ou senha incorretos");
        return;
      }

      const profile = await getProfile(data.user.id);
      if (!profile) {
        setError("Perfil não encontrado. Contate o suporte.");
        return;
      }

      onLogin(profile);
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Registro com Supabase
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!regName.trim() || !regPhone.trim() || !regUser.trim() || !regPass.trim()) {
      setError("Preencha todos os campos");
      return;
    }

    const phoneDigits = regPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError("Celular inválido. Use o formato (11) 99999-9999");
      return;
    }
    if (regPhone.trim() !== regConfirmPhone.trim()) {
      setError("Os números de celular não conferem");
      return;
    }
    if (regPass !== regConfirm) {
      setError("As senhas não conferem");
      return;
    }
    if (regPass.length < 4) {
      setError("A senha deve ter pelo menos 4 caracteres");
      return;
    }

    setLoading(true);
    try {
      // Verifica duplicatas antes de criar
      const [usernameTaken, phoneTaken] = await Promise.all([
        usernameExists(regUser.trim().toLowerCase()),
        phoneExists(regPhone.trim()),
      ]);

      if (usernameTaken) { setError("Este usuário já existe"); return; }
      if (phoneTaken)    { setError("Este celular já está cadastrado"); return; }

      const fakeEmail = `${regUser.trim().toLowerCase()}@rvfinanca.app`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: regPass.trim(),
      });

      if (signUpError || !data.user) {
        setError(signUpError?.message || "Erro ao criar conta");
        return;
      }

      const newProfile: Profile = {
        id: data.user.id,
        name: regName.trim(),
        phone: regPhone.trim(),
        username: regUser.trim().toLowerCase(),
      };

      const created = await createProfile(newProfile);
      if (!created) {
        setError("Erro ao salvar perfil. Tente novamente.");
        return;
      }

      setSuccess("Conta criada com sucesso!");
      setTimeout(() => onLogin(newProfile), 500);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#f0f0f0] font-sans flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="RV Finança" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold m-0 bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">
            RV Finança
          </h1>
          <p className="text-[#888] text-sm mt-2">Controle suas finanças de forma inteligente</p>
        </div>

        {/* Card */}
        <Card className="bg-white/[0.03] border-white/[0.07] overflow-hidden">
          {/* Toggle */}
          <div className="flex border-b border-white/[0.07]">
            <button
              className={`flex-1 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
                mode === "login"
                  ? "text-white border-b-2 border-orange-500"
                  : "text-[#888] hover:text-[#ccc]"
              }`}
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
            >
              <span className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Entrar
              </span>
            </button>
            <button
              className={`flex-1 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
                mode === "register"
                  ? "text-white border-b-2 border-orange-500"
                  : "text-[#888] hover:text-[#ccc]"
              }`}
              onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
            >
              <span className="flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> Cadastrar
              </span>
            </button>
          </div>

          <CardContent className="p-5 sm:p-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-red-400 text-sm m-0">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-emerald-400 text-sm m-0">{success}</p>
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                    Usuário
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                      placeholder="Digite seu Usuário"
                      value={loginUser}
                      onChange={e => setLoginUser(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={loginPass}
                      onChange={e => setLoginPass(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer transition-colors"
                      onClick={() => setShowPassword(v => !v)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-2"
                >
                  <LogIn className="w-4 h-4" /> Acessar Dashboard
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                      placeholder="Seu nome"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
              <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
              Celular
              </label>
              <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
              <input
              className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
              type="tel"
              placeholder="(11) 99999-9999"
              value={regPhone}
              onChange={e => setRegPhone(formatPhone(e.target.value))}
              maxLength={15}
              />
              </div>
              </div>
              <div>
              <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
              Confirmar Celular
              </label>
              <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
              <input
              className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
              type="tel"
              placeholder="(11) 99999-9999"
              value={regConfirmPhone}
              onChange={e => setRegConfirmPhone(formatPhone(e.target.value))}
              maxLength={15}
              />
              </div>
              </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                    Usuário
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                      placeholder="Escolha um Usuário"
                      value={regUser}
                      onChange={e => setRegUser(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                      type="password"
                      placeholder="Mínimo 4 caracteres"
                      value={regPass}
                      onChange={e => setRegPass(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                      type="password"
                      placeholder="Repita a senha"
                      value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-2"
                >
                  <UserPlus className="w-4 h-4" /> Criar Conta
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[#666] text-xs mt-6">
          ðŸ”’ Seus dados ficam salvos apenas neste dispositivo.{" "}
          <span className="text-yellow-600">
            Não use senhas importantes aqui.
          </span>
        </p>
      </div>
    </div>
  );
}


// ===================== DASHBOARD =====================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; dataKey?: string; value: number; fill?: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-3.5 py-2 shadow-2xl">
        {label && <p className="text-white/70 text-xs mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} className="font-bold m-0" style={{ color: p.fill || "#F97316", fontSize: 13 }}>
            {p.name || p.dataKey}: {formatBRL(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TabButton = ({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string;
}) => (
  <button
    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
      active
        ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-white border border-orange-500/30"
        : "text-[#888] hover:text-[#ccc] hover:bg-white/5"
    }`}
    onClick={onClick}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const StatCard = ({ title, value, color, icon: Icon, editable, onEdit }: {
  title: string; value: string; color: string; icon: React.ElementType;
  editable?: boolean; onEdit?: () => void;
}) => (
  <Card className="bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.05] transition-all">
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#888] text-[11px] uppercase tracking-wider font-medium">{title}</p>
        <Icon className="w-4 h-4 text-[#888]" />
      </div>
      <p
        className={`font-bold text-lg sm:text-xl ${editable ? "cursor-pointer" : ""}`}
        style={{ color }}
        onClick={onEdit}
      >
        {value}
        {editable && <Pencil className="w-3 h-3 inline ml-1 text-[#888]" />}
      </p>
    </CardContent>
  </Card>
);


// ===================== PERFIL PANEL =====================

function PerfilPanel({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  const [tab, setTab] = useState<"foto" | "email" | "senha">("foto");

  // Phone fields
  const [newPhone, setNewPhone] = useState("");
  const [phonePass, setPhonePass] = useState("");

  // Password fields
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = () => { setError(""); setSuccess(""); };

  const [photoPreview, setPhotoPreview] = useState<string>(user.photo || "");
  useEffect(() => { setPhotoPreview(user.photo || ""); }, [user.photo]);

    // ✅ SUBSTITUA as funções de update dentro de PerfilPanel:

// handlePhotoUpload — apenas mude a parte de save:
const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { setError("Arquivo muito grande (máximo 5MB)"); return; }

  try {
    setSuccess("Comprimindo imagem...");
    const compressedBase64 = await compressImage(file, {
      maxWidth: 512, maxHeight: 512, quality: 0.75,
    });
    setPhotoPreview(compressedBase64);

    // ✅ Salva no Supabase
    const ok = await updateProfile(user.id, { photo: compressedBase64 });
    if (!ok) throw new Error("Falha ao salvar");

    onUpdate({ ...user, photo: compressedBase64 });
    setSuccess("Foto atualizada com sucesso!");
    setTimeout(() => setSuccess(""), 3000);
  } catch {
    setError("Erro ao processar imagem. Tente outra foto.");
  }
};

// handlePhoneChange — substitua o bloco de save:
const handlePhoneChange = async (e: React.FormEvent) => {
  e.preventDefault();
  clearMessages();
  if (!newPhone.trim()) { setError("Digite o novo celular"); return; }
  if (!phonePass.trim()) { setError("Digite sua senha atual"); return; }

  // ✅ Verifica senha via Supabase
  const fakeEmail = `${user.username}@rvfinanca.app`;
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: fakeEmail, password: phonePass.trim(),
  });
  if (authError) { setError("Senha incorreta"); return; }

  const phoneDigits = newPhone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 11) { setError("Celular inválido"); return; }
  if (newPhone.trim() === user.phone) { setError("O novo celular é igual ao atual"); return; }

  const taken = await phoneExists(newPhone.trim());
  if (taken) { setError("Este celular já está em uso"); return; }

  const ok = await updateProfile(user.id, { phone: newPhone.trim() });
  if (!ok) { setError("Erro ao salvar. Tente novamente."); return; }

  onUpdate({ ...user, phone: newPhone.trim() });
  setSuccess("Celular atualizado com sucesso!");
  setNewPhone("");
  setPhonePass("");
};

// handlePasswordChange — substitua o bloco de save:
const handlePasswordChange = async (e: React.FormEvent) => {
  e.preventDefault();
  clearMessages();
  if (!currentPass.trim()) { setError("Digite a senha atual"); return; }
  if (!newPass.trim())     { setError("Digite a nova senha"); return; }
  if (newPass.length < 4)  { setError("A nova senha deve ter pelo menos 4 caracteres"); return; }
  if (newPass !== confirmPass) { setError("As senhas não conferem"); return; }

  // ✅ Verifica senha atual e altera via Supabase Auth
  const fakeEmail = `${user.username}@rvfinanca.app`;
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: fakeEmail, password: currentPass.trim(),
  });
  if (verifyError) { setError("Senha atual incorreta"); return; }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPass.trim(),
  });
  if (updateError) { setError("Erro ao atualizar senha. Tente novamente."); return; }

  setSuccess("Senha atualizada com sucesso!");
  setCurrentPass(""); setNewPass(""); setConfirmPass("");
};


  return (
    <div className="space-y-4">
      {/* User info card */}
      <Card className="bg-white/[0.03] border-white/[0.07]">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-white" />
            )}
          </div>
          <div>
            <p className="font-bold text-white text-base">{user.name}</p>
            <p className="text-[#888] text-sm">@{user.username}</p>
            <p className="text-[#888] text-xs mt-0.5">{user.phone}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tab toggle */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setTab("foto"); clearMessages(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
            tab === "foto"
              ? "bg-orange-500/20 border-orange-500/30 text-white"
              : "bg-white/[0.03] border-white/[0.07] text-[#888] hover:text-white"
          }`}
        >
          <User className="w-4 h-4" /> Foto
        </button>
        <button
          onClick={() => { setTab("email"); clearMessages(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
            tab === "email"
              ? "bg-orange-500/20 border-orange-500/30 text-white"
              : "bg-white/[0.03] border-white/[0.07] text-[#888] hover:text-white"
          }`}
        >
          <Phone className="w-4 h-4" /> Alterar Celular
        </button>
        <button
          onClick={() => { setTab("senha"); clearMessages(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
            tab === "senha"
              ? "bg-orange-500/20 border-orange-500/30 text-white"
              : "bg-white/[0.03] border-white/[0.07] text-[#888] hover:text-white"
          }`}
        >
          <KeyRound className="w-4 h-4" /> Alterar Senha
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm m-0">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-400 text-sm m-0">{success}</p>
        </div>
      )}

      {/* ── Foto tab ── */}
      {tab === "foto" && (
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" /> Foto de Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center overflow-hidden">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-white" />
              )}
            </div>
            <label className="cursor-pointer w-full">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <span className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">
                <Paperclip className="w-4 h-4" /> Escolher Foto
              </span>
            </label>
            <p className="text-[#666] text-xs text-center">
              Tamanho máximo: 5MB. A imagem será comprimida automaticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Celular tab ── */}
      {tab === "email" && (
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-500" /> Alterar Celular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePhoneChange} className="space-y-3">
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                  Celular Atual
                </label>
                <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#666]">
                  {user.phone}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                  Novo Celular
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={newPhone}
                    onChange={e => setNewPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                  Confirme sua Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input
                    type="password"
                    placeholder="Digite sua senha atual"
                    value={phonePass}
                    onChange={e => setPhonePass(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-1"
              >
                <Check className="w-4 h-4" /> Salvar Novo Celular
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Senha tab ── */}
      {tab === "senha" && (
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-orange-500" /> Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                  Senha Atual
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Digite sua senha atual"
                    value={currentPass}
                    onChange={e => setCurrentPass(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                  Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="Mínimo 4 caracteres"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-1"
              >
                <Check className="w-4 h-4" /> Salvar Nova Senha
              </button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===================== DASHBOARD SCREEN PROPS =====================

interface DashboardScreenProps {
  user: User;
  onLogout: () => void;
  setCurrentUser: (u: User) => void;
}

// ===================== DASHBOARD SCREEN =====================

function DashboardScreen({ user, onLogout, setCurrentUser }: DashboardScreenProps) {
  const [selectedMonth, setSelectedMonth] = useState(4);
  // FIX: "perfil" adicionado ao tipo do activeTab
  const [activeTab, setActiveTab] = useState<string>("visão geral");
  const [showForm, setShowForm] = useState(false);
  // FIX: editIncome removido â€” não era usado para nada Ãºtil
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState<number>(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [valorReceita, setValorReceita] = useState("");
  const [gastoTab, setGastoTab] = useState<"normal" | "cartao">("normal");
  const [cardForm, setCardForm] = useState({
    description: "",
    amount: "",
    category: "Alimentação",
    date: "",
    cardName: "",
    installments: "1",
  });
  const [descReceita, setDescReceita] = useState("");
  const [catReceita, setCatReceita] = useState("salario");
  const [dataReceita, setDataReceita] = useState(() => new Date().toISOString().split("T")[0]);
  const [editingExpense, setEditingExpense] = useState<import("@/app/types").Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<import("../hooks/useFinance").IncomeEntry | null>(null);
  const [attachTarget, setAttachTarget] = useState<{ type: "expense" | "income"; id: number } | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const attachInputRef = useRef<HTMLInputElement | null>(null);

  const handleAttachClick = (type: "expense" | "income", id: number, existingAttachment?: string) => {
    if (existingAttachment) {
      window.open(existingAttachment, "_blank");
      return;
    }
    setAttachTarget({ type, id });
    attachInputRef.current?.click();
  };

  const handleAttachFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = attachTarget;
    e.target.value = "";
    if (!file || !target) return;
    if (file.size > 5 * 1024 * 1024) { alert("Arquivo muito grande (mÃ¡ximo 5MB)"); return; }

    setAttachLoading(true);
    try {
      let dataUrl: string;
      if (file.type.startsWith("image/")) {
        dataUrl = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.7 });
      } else {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      if (target.type === "expense") {
        const exp = finance.expenses.find(x => x.id === target.id);
        // FIX: updateExpense sem segundo argumento â€” consistente com o hook
        if (exp) finance.updateExpense({ ...exp, attachment: dataUrl, attachmentName: file.name } as Expense);
      } else {
        const inc = finance.incomeEntries.find(x => x.id === target.id);
        // FIX: updateIncome sem segundo argumento â€” consistente com o hook
        if (inc) finance.updateIncome({ ...inc, attachment: dataUrl, attachmentName: file.name });
      }
    } catch {
      alert("Erro ao processar o arquivo.");
    } finally {
      setAttachLoading(false);
      setAttachTarget(null);
    }
  };

  const investments = useInvestments();
  const [investmentValue, setInvestmentValue] = useState("");

  const [userPhoto, setUserPhoto] = useState(user.photo || "");
  useEffect(() => { setUserPhoto(user.photo || ""); }, [user.photo]);

  // Profile menu
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [showExtrato, setShowExtrato] = useState(false);
  const [extratoFiltroCategoria, setExtratoFiltroCategoria] = useState("todas");
  const [extratoFiltroTipo, setExtratoFiltroTipo] = useState<"ambos" | "gastos" | "receitas">("ambos");
  const [extratoMes, setExtratoMes] = useState(selectedMonth);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  const currentYear = new Date().getFullYear();
  const formDefaultDate = `${currentYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;

  const [form, setForm] = useState({
    description: "",
    category: "Alimentação",
    amount: "",
    date: formDefaultDate,
  });

  const finance = useFinance(selectedMonth);

  const handleAddExpense = () => {
    if (finance.addExpense(form)) {
      setForm({
        description: "",
        category: "Alimentação",
        amount: "",
        date: `${currentYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`,
      });
      setShowForm(false);
    }
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    setForm(prev => ({
      ...prev,
      date: `${currentYear}-${String(month + 1).padStart(2, "0")}-01`,
    }));
  };

  const getSavingsColor = (rate: number) => {
    if (rate >= 20) return "bg-emerald-500";
    if (rate >= 10) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSavingsTextColor = (rate: number) => {
    if (rate >= 20) return "text-emerald-500";
    if (rate >= 10) return "text-yellow-500";
    return "text-red-500";
  };

  const getBudgetStatusColor = (pct: number) => {
    if (pct <= 50) return "text-emerald-500";
    if (pct <= 80) return "text-yellow-500";
    if (pct <= 100) return "text-orange-500";
    return "text-red-500";
  };

  const getBudgetBarColor = (pct: number) => {
    if (pct <= 50) return "#10B981";
    if (pct <= 80) return "#EAB308";
    if (pct <= 100) return "#F97316";
    return "#EF4444";
  };

  // FIX: "perfil" adicionado aos tabs para ser acessÃ­vel via barra de navegação
  const tabs = [
    { id: "visão geral",   label: "Visão Geral",   icon: PieIcon },
    { id: "gastos",        label: "Gastos",         icon: Receipt },
    { id: "investimentos", label: "Investimentos",  icon: TrendingUpIcon },
    { id: "histÃ³rico",     label: "HistÃ³rico",      icon: BarChart3 },
    { id: "metas",         label: "Metas",          icon: Target },
    { id: "relatÃ³rios",    label: "RelatÃ³rios",     icon: TrendingUp },
    { id: "perfil",        label: "Perfil",         icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#f0f0f0] font-sans">
      <div className="max-w-[800px] mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
              {userPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userPhoto} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold m-0 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="RV Finança" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
                <span className="bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">RV Finança</span>
              </h1>
              <div className="flex items-center gap-2 mt-1 relative" ref={profileMenuRef}>
                <p className="text-[#888] text-[13px] m-0">OlÃ¡, <span className="text-orange-500 font-semibold">{user.name}</span>!</p>
                <button
                  onClick={() => setShowProfileMenu(v => !v)}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] text-[#888] hover:text-white hover:bg-white/[0.05] transition-colors text-sm"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Perfil</span>
                </button>

                {showProfileMenu && (
                  <div className="absolute left-0 top-full mt-2 w-44 bg-[#0b0b14] border border-white/[0.07] rounded-lg shadow-lg py-1 z-50">
                    <button
                      onClick={() => { setActiveTab("perfil"); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4 text-[#888]" />
                      Editar perfil
                    </button>
                    <button
                      onClick={() => { setShowProfileMenu(false); onLogout(); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center gap-2 text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
              onClick={() => setShowForm(v => !v)}
            >
              <Plus className="w-4 h-4" />
              Adicionar Gasto
            </button>
            <button
              onClick={() => { setExtratoMes(selectedMonth); setShowExtrato(true); }}
              className="bg-white/5 border border-white/10 text-[#ccc] hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Extrato</span>
            </button>
            <button
              onClick={() => setModalAberto(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar Receita</span>
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <Card className="bg-white/[0.03] border-white/[0.07] mb-5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-[#888]" />
            <span className="text-[#888] text-xs uppercase tracking-wider font-medium">PerÃ­odo</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                className={`text-xs rounded-lg px-2.5 py-1.5 cursor-pointer transition-all border font-medium ${
                  selectedMonth === i
                    ? "bg-orange-500 border-orange-500 text-white font-bold shadow-md shadow-orange-500/20"
                    : "bg-transparent border-white/10 text-[#888] hover:text-white hover:border-white/20"
                }`}
                onClick={() => handleMonthChange(i)}
              >
                {m}
              </button>
            ))}
          </div>
        </Card>

        {/* Modal Novo Gasto */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-[480px]">
              <Card className="bg-white/[0.03] border-white/[0.07] overflow-hidden">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-orange-500" />
                      Novo Lançamento
                    </CardTitle>
                    <button
                      onClick={() => setShowForm(false)}
                      className="text-[#888] hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Tabs */}
                  <div className="flex border-b border-white/[0.07]">
                    <button
                      onClick={() => setGastoTab("normal")}
                      className={`flex-1 py-2.5 text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        gastoTab === "normal"
                          ? "text-white border-b-2 border-orange-500"
                          : "text-[#888] hover:text-[#ccc]"
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" /> Gasto
                    </button>
                    <button
                      onClick={() => setGastoTab("cartao")}
                      className={`flex-1 py-2.5 text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        gastoTab === "cartao"
                          ? "text-white border-b-2 border-purple-500"
                          : "text-[#888] hover:text-[#ccc]"
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Cartão de Crédito
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {gastoTab === "normal" ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <input
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                          placeholder="Descrição do gasto"
                          value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                        <input
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                          type="number"
                          placeholder="Valor (R$)"
                          value={form.amount}
                          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        />
                        <select
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full cursor-pointer transition-colors"
                          value={form.category}
                          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.name} value={c.name} className="bg-[#1a1a2e]">
                              {c.icon} {c.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full transition-colors"
                          type="date"
                          value={form.date}
                          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                      <button
                        className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                        onClick={handleAddExpense}
                      >
                        <Check className="w-4 h-4" /> Salvar Gasto
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <input
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full placeholder:text-[#666] transition-colors"
                          placeholder="Descrição (ex: Compra Mercado)"
                          value={cardForm.description}
                          onChange={e => setCardForm(f => ({ ...f, description: e.target.value }))}
                        />
                        <input
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full placeholder:text-[#666] transition-colors"
                          type="number"
                          placeholder="Valor total (R$)"
                          value={cardForm.amount}
                          onChange={e => setCardForm(f => ({ ...f, amount: e.target.value }))}
                        />
                        <input
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full placeholder:text-[#666] transition-colors"
                          placeholder="Nome do cartão (ex: Nubank)"
                          value={cardForm.cardName}
                          onChange={e => setCardForm(f => ({ ...f, cardName: e.target.value }))}
                        />
                        <select
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full cursor-pointer transition-colors"
                          value={cardForm.installments}
                          onChange={e => setCardForm(f => ({ ...f, installments: e.target.value }))}
                        >
                          {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={String(n)} className="bg-[#1a1a2e]">
                              {n === 1 ? "Ã€ vista (1x)" : `${n}x de ${cardForm.amount ? `R$ ${(parseFloat(cardForm.amount) / n).toFixed(2).replace(".", ",")}` : "â€”"}`}
                            </option>
                          ))}
                        </select>
                        <select
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full cursor-pointer transition-colors"
                          value={cardForm.category}
                          onChange={e => setCardForm(f => ({ ...f, category: e.target.value }))}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.name} value={c.name} className="bg-[#1a1a2e]">
                              {c.icon} {c.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full transition-colors"
                          type="date"
                          value={cardForm.date}
                          onChange={e => setCardForm(f => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                      {cardForm.amount && parseFloat(cardForm.amount) > 0 && parseInt(cardForm.installments) > 1 && (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2.5 mb-3 text-xs text-purple-300">
                          ðŸ’³ {parseInt(cardForm.installments)}x de{" "}
                          <strong>R$ {(parseFloat(cardForm.amount) / parseInt(cardForm.installments)).toFixed(2).replace(".", ",")}</strong>
                          {" "}â€” Total: <strong>R$ {parseFloat(cardForm.amount).toFixed(2).replace(".", ",")}</strong>
                          {cardForm.cardName && ` â€” ${cardForm.cardName}`}
                        </div>
                      )}
                      <button
                        className="bg-gradient-to-br from-purple-600 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                        onClick={() => {
                          if (!cardForm.description || !cardForm.amount || !cardForm.date) return;
                          const total = parseFloat(cardForm.amount);
                          const n = parseInt(cardForm.installments);
                          const installmentValue = total / n;
                          for (let i = 0; i < n; i++) {
                            const d = new Date(cardForm.date + "T00:00:00");
                            d.setMonth(d.getMonth() + i);
                            const dateStr = d.toISOString().split("T")[0];
                            const desc = n > 1
                              ? `${cardForm.description}${cardForm.cardName ? ` (${cardForm.cardName})` : ""} ${i + 1}/${n}`
                              : `${cardForm.description}${cardForm.cardName ? ` (${cardForm.cardName})` : ""}`;
                            finance.addExpense({
                              description: desc,
                              category: cardForm.category,
                              amount: String(installmentValue.toFixed(2)),
                              date: dateStr,
                            });
                          }
                          setCardForm({ description: "", amount: "", category: "Alimentação", date: "", cardName: "", installments: "1" });
                          setShowForm(false);
                        }}
                      >
                        <Check className="w-4 h-4" /> Salvar {parseInt(cardForm.installments) > 1 ? `${cardForm.installments} parcelas` : "Compra"}
                      </button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 flex-wrap">
          {tabs.map(t => (
            <TabButton
              key={t.id}
              active={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              icon={t.icon}
              label={t.label}
            />
          ))}
        </div>

        {/* ===== VISÃƒO GERAL ===== */}
        {activeTab === "visão geral" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                title="Renda"
                value={formatBRL(finance.monthlyIncome)}
                color="#10B981"
                icon={PiggyBank}
                editable
                // FIX: clique na renda abre diretamente o modal de receita
                onEdit={() => setModalAberto(true)}
              />
              <StatCard
                title="Gastos"
                value={formatBRL(finance.totalExpenses)}
                color="#F97316"
                icon={TrendingDown}
              />
              <StatCard
                title="Saldo"
                value={formatBRL(finance.balance)}
                color={finance.balance >= 0 ? "#10B981" : "#EF4444"}
                icon={finance.balance >= 0 ? TrendingUp : TrendingDown}
              />
              <StatCard
                title="Economia"
                value={`${finance.savingsRate.toFixed(1)}%`}
                color={finance.savingsRate >= 20 ? "#10B981" : finance.savingsRate >= 10 ? "#EAB308" : "#EF4444"}
                icon={Target}
              />
            </div>

            <Card className="bg-white/[0.03] border-white/[0.07]">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] text-[#ccc] font-medium">Taxa de Economia</span>
                  <span className={`font-bold ${getSavingsTextColor(finance.savingsRate)}`}>
                    {finance.savingsRate.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-white/[0.07] rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${getSavingsColor(finance.savingsRate)}`}
                    style={{ width: `${Math.min(100, Math.max(0, finance.savingsRate))}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {finance.savingsRate >= 20 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                  <p className="text-[#888] text-xs">
                    {finance.savingsRate >= 20
                      ? "Excelente! Continue assim â€” você está economizando bem."
                      : finance.savingsRate >= 10
                        ? "Bom progresso, mas ainda dÃ¡ para melhorar."
                        : "Atenção: seus gastos estão altos. Tente reduzir."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {finance.byCategoryFiltered.length > 0 && (
                <Card className="bg-white/[0.03] border-white/[0.07]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-orange-500" />
                      Distribuição de Gastos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={finance.byCategoryFiltered}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {finance.byCategoryFiltered.map((c, i) => (
                            <Cell key={i} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          formatter={(v) => <span className="text-[#ccc] text-xs">{v}</span>}
                          wrapperStyle={{ fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
                 </div> 
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-orange-500" />
                    Renda vs Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={finance.incomeVsExpenses.slice(0, 6)} barCategoryGap="20%">
                      <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                     <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v}`} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-[#888] text-xs">{v}</span>} />
                      <Bar dataKey="renda" name="Renda" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="gastos" name="Gastos" fill="#F97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            <Card className="bg-white/[0.03] border-white/[0.07]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  Evolução Mensal de Gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={finance.monthlyData} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$ ${v}`} />
                     <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
                     <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]}>
                       {finance.monthlyData.map((_, i) => (
                         <Cell key={i} fill={i === selectedMonth ? "#EC4899" : "#F97316"} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
                 <p className="text-center text-[#666] text-xs mt-3">
                   O mês atual ({MONTHS[selectedMonth]}) está destacado em rosa
                 </p>
               </CardContent>
             </Card>

            <Card className="bg-white/[0.03] border-white/[0.07]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  TendÃªncia de Gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={finance.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$ ${v}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-[#888] text-xs">{v}</span>} />
                    <Bar dataKey="renda" name="Renda" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/[0.07]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  Evolução do Saldo Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={finance.incomeVsExpenses}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-[#888] text-xs">{v}</span>} />
                    <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 4 }} activeDot={{ r: 6, fill: "#10B981" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardContent className="p-4">
                  <p className="text-[#888] text-[11px] uppercase tracking-wider m-0">Total Gasto no Ano</p>
                  <p className="text-orange-500 font-bold text-lg m-0 mt-1">
                    {formatBRL(finance.monthlyData.reduce((s, m) => s + m.total, 0))}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardContent className="p-4">
                  <p className="text-[#888] text-[11px] uppercase tracking-wider m-0">Média Mensal</p>
                  <p className="text-[#ccc] font-bold text-lg m-0 mt-1">
                    {formatBRL(finance.monthlyData.reduce((s, m) => s + m.total, 0) / 12)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardContent className="p-4">
                  <p className="text-[#888] text-[11px] uppercase tracking-wider m-0">Maior Gasto</p>
                  <p className="text-red-500 font-bold text-lg m-0 mt-1">
                    {formatBRL(Math.max(...finance.monthlyData.map(m => m.total)))}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardContent className="p-4">
                  <p className="text-[#888] text-[11px] uppercase tracking-wider m-0">Menor Gasto</p>
                  <p className="text-emerald-500 font-bold text-lg m-0 mt-1">
                    {formatBRL(Math.min(...finance.monthlyData.map(m => m.total)))}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ===== PERFIL ===== */}
        {activeTab === "perfil" && (
          <PerfilPanel user={user} onUpdate={setCurrentUser} />
        )}

      </div>{/* end max-w container */}

      {/* ===== MODAL ADICIONAR RECEITA ===== */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[480px]">
            <Card className="bg-white/[0.03] border-white/[0.07] overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Nova Receita
                  </CardTitle>
                  <button
                    onClick={() => setModalAberto(false)}
                    className="text-[#888] hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Descrição da receita"
                    value={descReceita}
                    onChange={e => setDescReceita(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 w-full placeholder:text-[#666] transition-colors"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor (R$)"
                    value={valorReceita}
                    onChange={e => setValorReceita(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 w-full placeholder:text-[#666] transition-colors"
                  />
                  <select
                    value={catReceita}
                    onChange={e => setCatReceita(e.target.value)}
                    className="bg-[#1a1a2e] border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 w-full cursor-pointer transition-colors"
                  >
                    <option value="salario"      className="bg-[#1a1a2e]">ðŸ’° SalÃ¡rio</option>
                    <option value="freelance"    className="bg-[#1a1a2e]">ðŸ’» Freelance</option>
                    <option value="investimento" className="bg-[#1a1a2e]">ðŸ“ˆ Investimento</option>
                    <option value="outro"        className="bg-[#1a1a2e]">ðŸ’¡ Outro</option>
                  </select>
                  <input
                    type="date"
                    value={dataReceita}
                    onChange={e => setDataReceita(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 w-full transition-colors"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!valorReceita) return;
                    finance.addIncome(valorReceita, descReceita || "Receita", catReceita, dataReceita);
                    setValorReceita("");
                    setDescReceita("");
                    setCatReceita("salario");
                    setDataReceita(new Date().toISOString().split("T")[0]);
                    setModalAberto(false);
                  }}
                  className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Check className="w-4 h-4" /> Salvar Receita
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Input escondido para anexar comprovantes */}
      <input
        type="file"
        ref={attachInputRef}
        onChange={handleAttachFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />
      {attachLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white/[0.05] border border-white/10 rounded-xl px-6 py-4 flex items-center gap-3 text-sm text-[#ccc]">
            <Loader className="w-4 h-4 animate-spin" />
            Enviando anexo...
          </div>
        </div>
      )}

      {/* Modal Extrato */}
      {showExtrato && (() => {
        const expenseItems = finance.expenses
          .filter(e => new Date(e.date + "T00:00:00").getMonth() === extratoMes)
          .filter(e => extratoFiltroCategoria === "todas" || e.category === extratoFiltroCategoria)
          .filter(() => extratoFiltroTipo === "ambos" || extratoFiltroTipo === "gastos");
        const incomeItems = finance.incomeEntries
          .filter(e => new Date(e.date + "T00:00:00").getMonth() === extratoMes)
          .filter(() => extratoFiltroTipo === "ambos" || extratoFiltroTipo === "receitas");
        const allItems = [
          ...expenseItems.map(e => ({ ...e, _tipo: "Gasto" as const })),
          ...incomeItems.map(e => ({ ...e, _tipo: "Receita" as const, category: e.type })),
        ].sort((a, b) => +new Date(b.date) - +new Date(a.date));
        const totalGastos = expenseItems.reduce((s, e) => s + e.amount, 0);
        const totalReceitas = incomeItems.reduce((s, e) => s + e.amount, 0);
        const saldo = totalReceitas - totalGastos;
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-[640px] max-h-[90vh] flex flex-col">
              <Card className="bg-[#0b0b14] border-white/[0.07] overflow-hidden flex flex-col max-h-[90vh]">
                <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" />
                      Extrato
                    </CardTitle>
                    <button onClick={() => setShowExtrato(false)} className="text-[#888] hover:text-white transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <select
                      value={extratoMes}
                      onChange={e => setExtratoMes(parseInt(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-2.5 py-2 text-xs outline-none focus:border-orange-500 cursor-pointer"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i} className="bg-[#0b0b14]">{m}</option>
                      ))}
                    </select>
                    <select
                      value={extratoFiltroCategoria}
                      onChange={e => setExtratoFiltroCategoria(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-2.5 py-2 text-xs outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="todas" className="bg-[#0b0b14]">Todas categorias</option>
                      {CATEGORIES.map(c => (
                        <option key={c.name} value={c.name} className="bg-[#0b0b14]">{c.icon} {c.name}</option>
                      ))}
                    </select>
                    <select
                      value={extratoFiltroTipo}
                      onChange={e => setExtratoFiltroTipo(e.target.value as "ambos" | "gastos" | "receitas")}
                      className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-2.5 py-2 text-xs outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="ambos" className="bg-[#0b0b14]">Gastos e Receitas</option>
                      <option value="gastos" className="bg-[#0b0b14]">SÃ³ Gastos</option>
                      <option value="receitas" className="bg-[#0b0b14]">SÃ³ Receitas</option>
                    </select>
                  </div>
                </CardHeader>

                <CardContent className="overflow-y-auto flex-1 px-4 py-2">
                  <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                      <div>
                        <h1 className="text-xl font-extrabold text-gray-900">RV Finança â€” Extrato Mensal</h1>
                        <p className="text-sm text-gray-600">OlÃ¡, {user.name}! &nbsp;Â·&nbsp; PerÃ­odo: {MONTHS[extratoMes]}/2026</p>
                      </div>
                    </div>
                  </div>

                  {allItems.length === 0 ? (
                    <p className="text-[#666] text-sm text-center py-6">Nenhum lançamento encontrado.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#888] text-xs border-b border-white/[0.05] print:text-gray-500">
                          <th className="text-left py-2 font-medium">Data</th>
                          <th className="text-left py-2 font-medium">Descrição</th>
                          <th className="text-left py-2 font-medium hidden sm:table-cell">Categoria</th>
                          <th className="text-left py-2 font-medium">Tipo</th>
                          <th className="text-right py-2 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-white/[0.03] print:border-gray-200">
                            <td className="py-2.5 text-[#888] whitespace-nowrap text-xs">
                              {new Date(item.date + "T00:00:00").toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-2.5 text-[#f0f0f0] print:text-gray-900 pr-2">{item.description}</td>
                            <td className="py-2.5 text-[#888] hidden sm:table-cell text-xs">{item.category}</td>
                            <td className="py-2.5 text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${item._tipo === "Receita" ? "bg-emerald-500/20 text-emerald-400" : "bg-orange-500/20 text-orange-400"}`}>
                                {item._tipo}
                              </span>
                            </td>
                            <td className={`py-2.5 text-right font-bold whitespace-nowrap ${item._tipo === "Receita" ? "text-emerald-400" : "text-[#f0f0f0]"}`}>
                              {item._tipo === "Receita" ? "+" : ""}{formatBRL(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div className="mt-4 pt-3 border-t border-white/[0.07] print:border-gray-300 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[#888] text-xs mb-0.5">Total Gastos</p>
                      <p className="text-orange-400 font-bold text-sm">{formatBRL(totalGastos)}</p>
                    </div>
                    <div>
                      <p className="text-[#888] text-xs mb-0.5">Total Receitas</p>
                      <p className="text-emerald-400 font-bold text-sm">{formatBRL(totalReceitas)}</p>
                    </div>
                    <div>
                      <p className="text-[#888] text-xs mb-0.5">Saldo</p>
                      <p className={`font-bold text-sm ${saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatBRL(saldo)}</p>
                    </div>
                  </div>
                </CardContent>

                <div className="px-4 pb-4 flex-shrink-0">
                  <button
                    onClick={() => window.print()}
                    className="w-full bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
                  >
                    <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
                  </button>
                </div>
              </Card>
            </div>
          </div>
        );
      })()}

    </div>
  );
}


// ===================== MAIN APP =====================

// ✅ SUBSTITUA o componente App inteiro:
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Recupera sessão ativa ao carregar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setCurrentUser(profile);
      }
      setLoading(false);
    });

    // Listener para mudanças de auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await getProfile(session.user.id);
          setCurrentUser(profile);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (user: User) => setCurrentUser(user);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // Tela de loading inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RV Finança" className="w-16 h-16 object-contain animate-pulse" />
          <Loader className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <DashboardScreen
      user={currentUser}
      onLogout={handleLogout}
      setCurrentUser={setCurrentUser}
    />
  );
}


