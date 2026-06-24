"use client";

import { useState, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, CartesianGrid
} from "recharts";
import {
  Wallet, Plus, X, Pencil, Check, Lightbulb, Trash2,
  TrendingUp, TrendingDown, Target, BarChart3, PieChart as PieIcon,
  Receipt, CalendarDays, ChevronRight, AlertTriangle, CheckCircle2,
  PiggyBank, LogIn, UserPlus, LogOut, Eye, EyeOff, Lock, User, Mail,
  PlusCircle, DollarSign, Settings, KeyRound, ShieldCheck, TrendingUpIcon, Zap, Loader,
  FileText, Printer, Paperclip, Phone, Fingerprint,
  ScanFace
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFinance, CATEGORIES, MONTHS } from "@/app/hooks/useFinance";
import { useInvestments } from "@/app/hooks/useInvestments";
import { formatBRL } from "@/app/utils/investmentUtils";
import { compressImage } from "@/app/utils/imageCompression";
import type { Expense } from "@/app/types";
import { supabase } from "@/lib/supabase";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import { generateTotpSecret, verifyTotpCode } from "@/lib/totp";
import TwoFactorLoginModal from "@/components/TwoFactorLoginModal";
import PasskeyLoginModal from "@/components/PasskeyLoginModal";
import {
  getEmailByUsername,
  getProfile,
  createProfile,
  updateProfile,
  phoneExists,
  type Profile,
} from "@/lib/supabaseProfile";
import { RadarTab } from "@/components/RadarTab";
import { Radar as RadarIcon } from "lucide-react";
import type { IncomeEntry } from "@/app/hooks/useFinance";
import { useAuthMethods } from '@/app/hooks/useAuthMethods';
import { SecurityMethodCard } from '@/components/SecurityMethodCard';
import type { AuthMethod } from "@/app/hooks/useAuthMethods";

// ===================== TIPOS =====================

type User = Profile;

type StatusFilter = "all" | "pending" | "paid";
type DueDateStatus = "overdue" | "due-today" | "upcoming" | "ok";

// ===================== HELPERS =====================

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getDueDateStatus(
  dueDate: string | null | undefined,
  isPaid: boolean
): DueDateStatus | null {
  if (!dueDate || isPaid) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "due-today";
  if (diffDays <= 3) return "upcoming";
  return "ok";
}

function getDueDateLabel(status: DueDateStatus, dueDate: string): string {
  const due = new Date(dueDate + "T00:00:00");
  const formatted = due.toLocaleDateString("pt-BR");
  if (status === "overdue") return `⚠️ Vencido ${formatted}`;
  if (status === "due-today") return `🔴 Vence hoje`;
  if (status === "upcoming") return `⏰ Vence ${formatted}`;
  return `📅 ${formatted}`;
}

// ===================== TOOLTIP CUSTOMIZADO =====================

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

// ===================== COMPONENTES REUTILIZÁVEIS =====================

const TabButton = ({
  active, onClick, icon: Icon, label,
}: {
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

const StatCard = ({
  title, value, color, icon: Icon, editable, onEdit,
}: {
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

// ===================== AUTH SCREEN =====================

function AuthScreen({ onLogin }: { onLogin: (user: Profile) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);

  const [show2FALogin, setShow2FALogin] = useState(false);
  const [pendingLoginProfile, setPendingLoginProfile] = useState<Profile | null>(null);

  const [pendingTokens, setPendingTokens] = useState<{
    access_token: string;
    refresh_token: string;
  } | null>(null);

  const [showPasskeyLogin, setShowPasskeyLogin] = useState(false);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"form" | "success">("form");
  const [forgotUser, setForgotUser] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotTotpCode, setForgotTotpCode] = useState("");
  const [forgotShowNew, setForgotShowNew] = useState(false);
  const [forgotShowConfirm, setForgotShowConfirm] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const resetForgot = () => {
    setShowForgot(false);
    setForgotStep("form");
    setForgotUser("");
    setForgotNewPass("");
    setForgotConfirmPass("");
    setForgotTotpCode("");
    setForgotError("");
    setForgotSuccess("");
  };

  const handle2FASuccess = () => {
    setShow2FAModal(false);
    setSuccess("Conta criada com sucesso! 🎉");
    if (pendingProfile) setTimeout(() => onLogin(pendingProfile), 600);
  };

  const handle2FALoginSuccess = () => {
    setShow2FALogin(false);
    setPendingTokens(null);
    if (pendingLoginProfile) onLogin(pendingLoginProfile);
  };

  const handle2FALoginCancel = async () => {
    await supabase.auth.signOut();
    setShow2FALogin(false);
    setPendingLoginProfile(null);
    setPendingTokens(null);
    setError("Verificação 2FA cancelada.");
  };

  const handlePasskeyLoginSuccess = () => {
    setShowPasskeyLogin(false);
    if (pendingLoginProfile) onLogin(pendingLoginProfile);
  };

  const handlePasskeyLoginCancel = async () => {
    await supabase.auth.signOut();
    setShowPasskeyLogin(false);
    setPendingLoginProfile(null);
    setError("Autenticação cancelada.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginUser.trim() || !loginPass.trim()) {
      setError("Preencha usuário e senha");
      return;
    }
    setLoading(true);
    try {
      const realEmail = await getEmailByUsername(loginUser.trim().toLowerCase());
      if (!realEmail) { setError("Usuário não encontrado"); return; }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: realEmail,
        password: loginPass.trim(),
      });
      if (authError || !data.user) { setError("Usuário ou senha incorretos"); return; }

      const profile = await getProfile(data.user.id);
      if (!profile) { setError("Perfil não encontrado. Contate o suporte."); return; }

      const { data: authMethods } = await supabase
        .from("user_auth_methods")
        .select("method, is_active")
        .eq("user_id", data.user.id);

      const activeMethods = (authMethods ?? [])
        .filter((m) => m.is_active)
        .map((m) => m.method as AuthMethod);

      const totpAtivo = activeMethods.includes("totp") && !!profile.totp_secret;
      const passkeyAtiva = activeMethods.includes("passkey");
      const biometricAtiva = activeMethods.includes("biometric");

      if (totpAtivo) {
        setPendingLoginProfile(profile);
        setPendingTokens({
          access_token: data.session!.access_token,
          refresh_token: data.session!.refresh_token,
        });
        setShow2FALogin(true);
        return;
      }

      if (passkeyAtiva || biometricAtiva) {
        setPendingLoginProfile(profile);
        setShowPasskeyLogin(true);
        return;
      }

      onLogin(profile);

    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!regName.trim())    { setError("Digite seu nome completo"); return; }
    if (!regPhone.trim())   { setError("Digite seu celular"); return; }
    if (!regEmail.trim())   { setError("Digite seu e-mail"); return; }
    if (!regUser.trim())    { setError("Escolha um nome de usuário"); return; }
    if (!regPass.trim())    { setError("Digite uma senha"); return; }
    if (regPass.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    if (regPass !== regConfirm) { setError("As senhas não conferem"); return; }

    setLoading(true);
    try {
      const emailExistente = await getEmailByUsername(regUser.trim().toLowerCase());
      if (emailExistente) { setError("Este nome de usuário já está em uso"); return; }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: regEmail.trim().toLowerCase(),
        password: regPass.trim(),
      });

      if (signUpError || !data.user) {
        setError(signUpError?.message ?? "Erro ao criar conta. Tente novamente.");
        return;
      }

      const novoProfile: Profile = {
        id: data.user.id,
        name: regName.trim(),
        phone: regPhone.trim(),
        username: regUser.trim().toLowerCase(),
        email: regEmail.trim().toLowerCase(),
        photo: "",
        totp_secret: null,
      };

      const profileCriado = await createProfile(novoProfile.id, {
        name: novoProfile.name,
        phone: novoProfile.phone,
        username: novoProfile.username,
        email: novoProfile.email,
        photo: "",
        totp_secret: null,
      });

      if (!profileCriado) {
        setError("Erro ao criar perfil. Tente novamente.");
        return;
      }

      const secret = generateTotpSecret();
      setTotpSecret(secret);
      setPendingProfile(novoProfile);

      await updateProfile(novoProfile.id, { totp_secret: secret });

      setShow2FAModal(true);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ===================== FORGOT PASSWORD =====================

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotUser.trim())       { setForgotError("Digite seu nome de usuário"); return; }
    if (!forgotNewPass.trim())    { setForgotError("Digite a nova senha"); return; }
    if (forgotNewPass.length < 6) { setForgotError("A senha deve ter pelo menos 6 caracteres"); return; }
    if (forgotNewPass !== forgotConfirmPass) { setForgotError("As senhas não conferem"); return; }
    if (forgotTotpCode.length !== 6) { setForgotError("Digite o código de 6 dígitos do autenticador"); return; }

    setForgotLoading(true);
    try {
      // 1. Busca o profile pelo username diretamente no banco
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, totp_secret")
        .eq("username", forgotUser.trim().toLowerCase())
        .single();

      if (profileError || !profileRow) {
        setForgotError("Usuário não encontrado");
        return;
      }

      if (!profileRow.totp_secret) {
        setForgotError("Este usuário não possui autenticador 2FA configurado");
        return;
      }

      // 2. Valida o código TOTP antes de qualquer ação
      import { generateTotpSecret, verifyTotpCode } from "@/lib/totp";
        setForgotError("Código 2FA inválido ou expirado. Tente novamente.");
        return;
      }

      // 3. Chama a API Route server-side para trocar a senha com service_role
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profileRow.id,
          newPassword: forgotNewPass.trim(),
          totpCode: forgotTotpCode,
          totpSecret: profileRow.totp_secret,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setForgotError(json.error ?? "Erro ao redefinir senha. Tente novamente.");
        return;
      }

      setForgotStep("success");
      setForgotSuccess("Senha redefinida com sucesso! Faça login com a nova senha.");

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#f0f0f0] font-sans flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px]">

        {/* Modal Esqueceu a Senha */}
        {showForgot && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-[400px]">
              <Card className="bg-[#0d0d1a] border-white/[0.07] overflow-hidden">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/20 flex items-center justify-center">
                        <KeyRound className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <h2 className="text-[15px] font-bold text-white m-0">Redefinir Senha</h2>
                        <p className="text-[#666] text-xs m-0">Confirme com seu autenticador</p>
                      </div>
                    </div>
                    <button onClick={resetForgot} className="text-[#888] hover:text-white transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {forgotError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-red-400 text-sm m-0">{forgotError}</p>
                    </div>
                  )}
                  {forgotStep === "success" ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <p className="text-emerald-400 text-sm m-0">{forgotSuccess}</p>
                      </div>
                      <button onClick={resetForgot} className="bg-white/5 border border-white/10 text-[#ccc] hover:text-white font-bold rounded-xl py-3 text-sm hover:bg-white/10 transition-all w-full cursor-pointer flex items-center justify-center gap-2">
                        ← Voltar ao Login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Nome de Usuário</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                          <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" placeholder="Digite seu usuário" value={forgotUser} onChange={e => setForgotUser(e.target.value)} autoFocus />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Nova Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                          <input type={forgotShowNew ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={forgotNewPass} onChange={e => setForgotNewPass(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" />
                          <button type="button" onClick={() => setForgotShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer transition-colors">
                            {forgotShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Confirmar Nova Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                          <input type={forgotShowConfirm ? "text" : "password"} placeholder="Repita a nova senha" value={forgotConfirmPass} onChange={e => setForgotConfirmPass(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" />
                          <button type="button" onClick={() => setForgotShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer transition-colors">
                            {forgotShowConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Código do Autenticador (2FA)</label>
                        <div className="relative">
                          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                          <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={forgotTotpCode} onChange={e => setForgotTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors tracking-[0.3em] font-mono" />
                        </div>
                        <p className="text-[#555] text-xs mt-1.5">Abra o Google Authenticator e digite o código de 6 dígitos.</p>
                      </div>
                      <button type="submit" disabled={forgotLoading} className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-60">
                        {forgotLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Redefinir Senha
                      </button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Modal Setup 2FA (cadastro) */}
        {show2FAModal && totpSecret && pendingProfile && (
          <TwoFactorSetupModal
            secret={totpSecret}
            username={pendingProfile.username}
            onSuccess={handle2FASuccess}
          />
        )}

        {/* Modal Login 2FA */}
        {show2FALogin && pendingLoginProfile && pendingTokens && (
          <TwoFactorLoginModal
            access_token={pendingTokens.access_token}
            refresh_token={pendingTokens.refresh_token}
            onSuccess={handle2FALoginSuccess}
            onCancel={handle2FALoginCancel}
          />
        )}

        {/* Modal Passkey/Biometria */}
        {showPasskeyLogin && pendingLoginProfile && (
          <PasskeyLoginModal
            userId={pendingLoginProfile.id}
            onSuccess={handlePasskeyLoginSuccess}
            onCancel={handlePasskeyLoginCancel}
          />
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="RV Finanças" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold m-0 bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">RV Finanças</h1>
          <p className="text-[#888] text-sm mt-2">Controle suas finanças de forma inteligente</p>
        </div>

        <Card className="bg-white/[0.03] border-white/[0.07] overflow-hidden">
          <div className="flex border-b border-white/[0.07]">
            <button
              className={`flex-1 py-3.5 text-sm font-semibold transition-all cursor-pointer ${mode === "login" ? "text-white border-b-2 border-orange-500" : "text-[#888] hover:text-[#ccc]"}`}
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
            >
              <span className="flex items-center justify-center gap-2"><LogIn className="w-4 h-4" /> Entrar</span>
            </button>
            <button
              className={`flex-1 py-3.5 text-sm font-semibold transition-all cursor-pointer ${mode === "register" ? "text-white border-b-2 border-orange-500" : "text-[#888] hover:text-[#ccc]"}`}
              onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
            >
              <span className="flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> Cadastrar</span>
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
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Usuário</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                      placeholder="Digite seu usuário"
                      value={loginUser}
                      onChange={e => setLoginUser(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-[#888] uppercase tracking-wider font-medium">Senha</label>
                    <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-orange-500 hover:text-orange-400 transition-colors cursor-pointer">
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={loginPass}
                      onChange={e => setLoginPass(e.target.value)}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer transition-colors" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-2 disabled:opacity-60"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Acessar Dashboard
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" placeholder="Seu nome completo" value={regName} onChange={e => setRegName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Celular</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" type="tel" placeholder="(11) 99999-9999" value={regPhone} onChange={e => setRegPhone(formatPhone(e.target.value))} maxLength={15} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" type="email" placeholder="seu@email.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Usuário</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" placeholder="Escolha um usuário" value={regUser} onChange={e => setRegUser(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" type="password" placeholder="Mínimo 6 caracteres" value={regPass} onChange={e => setRegPass(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" type="password" placeholder="Repita a senha" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-2 disabled:opacity-60"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Criar Conta
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[#666] text-xs mt-6">
          🔒 Seus dados ficam salvos com segurança.{" "}
          <span className="text-yellow-600">Não use senhas importantes aqui.</span>
        </p>
      </div>
    </div>
  );
}

// ===================== PERFIL PANEL =====================

type Method = 'totp' | 'biometric' | 'passkey'

function PerfilPanel({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  const [tab, setTab] = useState<'foto' | 'email' | 'senha' | 'segurança'>('foto')
  const [newPhone, setNewPhone] = useState('')
  const [phonePass, setPhonePass] = useState('')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const clearMessages = () => { setError(''); setSuccess('') }
  const [photoPreview, setPhotoPreview] = useState<string>(user.photo || '')
  useEffect(() => { setPhotoPreview(user.photo || '') }, [user.photo])

  const {
    methods,
    loading: methodsLoading,
    toggling,
    toggle,
    totalAtivos,
  } = useAuthMethods(user.id)

  const activeCount = totalAtivos

  const handleToggleMethod = async (method: Method, active: boolean) => {
    clearMessages()
    const err = await toggle(method, active)
    if (err) {
      setError(err)
      setTimeout(() => setError(''), 4000)
    } else {
      setSuccess(
        active
          ? `${methodLabels[method]} ativado com sucesso!`
          : `${methodLabels[method]} desativado.`
      )
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const methodLabels: Record<Method, string> = {
    totp: '2FA (Autenticador)',
    biometric: 'Biometria',
    passkey: 'Face ID / Passkey',
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Arquivo muito grande (máximo 5MB)'); return }
    try {
      setSuccess('Comprimindo imagem...')
      const compressedBase64 = await compressImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.75 })
      setPhotoPreview(compressedBase64)
      const ok = await updateProfile(user.id, { photo: compressedBase64 })
      if (!ok) throw new Error('Falha ao salvar')
      onUpdate({ ...user, photo: compressedBase64 })
      setSuccess('Foto atualizada com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Erro ao processar imagem. Tente outra foto.')
    }
  }

  const handlePhoneChange = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()
    if (!newPhone.trim()) { setError('Digite o novo celular'); return }
    if (!phonePass.trim()) { setError('Digite sua senha atual'); return }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: phonePass.trim() })
    if (authError) { setError('Senha incorreta'); return }
    const phoneDigits = newPhone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) { setError('Celular inválido'); return }
    if (newPhone.trim() === user.phone) { setError('O novo celular é igual ao atual'); return }
    const taken = await phoneExists(newPhone.trim())
    if (taken) { setError('Este celular já está em uso'); return }
    const ok = await updateProfile(user.id, { phone: newPhone.trim() })
    if (!ok) { setError('Erro ao salvar. Tente novamente.'); return }
    onUpdate({ ...user, phone: newPhone.trim() })
    setSuccess('Celular atualizado com sucesso!')
    setNewPhone(''); setPhonePass('')
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()
    if (!currentPass.trim()) { setError('Digite a senha atual'); return }
    if (!newPass.trim()) { setError('Digite a nova senha'); return }
    if (newPass.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres'); return }
    if (newPass !== confirmPass) { setError('As senhas não conferem'); return }
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPass.trim() })
    if (verifyError) { setError('Senha atual incorreta'); return }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPass.trim() })
    if (updateError) { setError('Erro ao atualizar senha. Tente novamente.'); return }
    setSuccess('Senha atualizada com sucesso!')
    setCurrentPass(''); setNewPass(''); setConfirmPass('')
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white/[0.03] border-white/[0.07]">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {photoPreview
              ? <img src={photoPreview} alt="Perfil" className="w-full h-full object-cover" />
              : <User className="w-7 h-7 text-white" />}
          </div>
          <div>
            <p className="font-bold text-white text-base">{user.name}</p>
            <p className="text-[#888] text-sm">@{user.username}</p>
            <p className="text-[#888] text-xs mt-0.5">{user.phone}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {(['foto', 'email', 'senha', 'segurança'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); clearMessages() }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
              tab === t
                ? 'bg-orange-500/20 border-orange-500/30 text-white'
                : 'bg-white/[0.03] border-white/[0.07] text-[#888] hover:text-white'
            }`}
          >
            {t === 'foto' && <><User className="w-4 h-4" /> Foto</>}
            {t === 'email' && <><Phone className="w-4 h-4" /> Alterar Celular</>}
            {t === 'senha' && <><KeyRound className="w-4 h-4" /> Alterar Senha</>}
            {t === 'segurança' && <><ShieldCheck className="w-4 h-4" /> Segurança</>}
          </button>
        ))}
      </div>

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

      {tab === 'foto' && (
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" /> Foto de Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center overflow-hidden">
              {photoPreview
                ? <img src={photoPreview} alt="Perfil" className="w-full h-full object-cover" />
                : <User className="w-12 h-12 text-white" />}
            </div>
            <label className="cursor-pointer w-full">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <span className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">
                <Paperclip className="w-4 h-4" /> Escolher Foto
              </span>
            </label>
            <p className="text-[#666] text-xs text-center">Tamanho máximo: 5MB. A imagem será comprimida automaticamente.</p>
          </CardContent>
        </Card>
      )}

      {tab === 'email' && (
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-500" /> Alterar Celular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePhoneChange} className="space-y-3">
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Celular Atual</label>
                <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#666]">{user.phone}</div>
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Novo Celular</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input type="tel" placeholder="(11) 99999-9999" value={newPhone} onChange={e => setNewPhone(formatPhone(e.target.value))} maxLength={15} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Confirme sua Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input type="password" placeholder="Digite sua senha atual" value={phonePass} onChange={e => setPhonePass(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" />
                </div>
              </div>
              <button type="submit" className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-1">
                <Check className="w-4 h-4" /> Salvar Novo Celular
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === 'senha' && (
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-orange-500" /> Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Senha Atual</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input type={showCurrent ? 'text' : 'password'} placeholder="Digite sua senha atual" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" />
                  <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input type={showNew ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={newPass} onChange={e => setNewPass(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" />
                  <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input type={showConfirm ? 'text' : 'password'} placeholder="Repita a nova senha" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-2.5 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-1">
                <Check className="w-4 h-4" /> Salvar Nova Senha
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === 'segurança' && (
        <Card className="bg-white/[0.03] border-white/[0.07]">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-500" /> Métodos de Autenticação
            </CardTitle>
            <p className="text-xs text-[#666] mt-1">
              Escolha como deseja autenticar no login. Pelo menos <strong className="text-orange-400">1 método</strong> deve permanecer ativo.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
              activeCount >= 2
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : activeCount === 1
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {activeCount >= 2 ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> {activeCount} métodos ativos — ótima segurança!</>
              ) : activeCount === 1 ? (
                <><AlertTriangle className="w-3.5 h-3.5" /> Apenas 1 método ativo — considere ativar mais.</>
              ) : (
                <><AlertTriangle className="w-3.5 h-3.5" /> Nenhum método ativo — ative pelo menos 1.</>
              )}
            </div>

            {methodsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-5 h-5 text-orange-500 animate-spin" />
                <span className="text-[#666] text-sm ml-2">Carregando...</span>
              </div>
            ) : (
              <>
                <SecurityMethodCard
                  icon={ShieldCheck}
                  title="2FA — Autenticador"
                  description="Código de 6 dígitos via Google Authenticator ou similar"
                  badge="Recomendado"
                  badgeColor="bg-orange-500/10 border-orange-500/30 text-orange-400"
                  isActive={methods.totp}
                  isToggling={toggling === 'totp'}
                  disabled={methods.totp && activeCount === 1}
                  onToggle={(active) => handleToggleMethod('totp', active)}
                />
                <SecurityMethodCard
                  icon={Fingerprint}
                  title="Biometria"
                  description="Autenticação por impressão digital no dispositivo"
                  badge="Dispositivo"
                  badgeColor="bg-blue-500/10 border-blue-500/30 text-blue-400"
                  isActive={methods.biometric}
                  isToggling={toggling === 'biometric'}
                  disabled={methods.biometric && activeCount === 1}
                  onToggle={(active) => handleToggleMethod('biometric', active)}
                />
                <SecurityMethodCard
                  icon={ScanFace}
                  title="Face ID / Passkey"
                  description="Reconhecimento facial ou chave de acesso do dispositivo"
                  badge="Passkey"
                  badgeColor="bg-purple-500/10 border-purple-500/30 text-purple-400"
                  isActive={methods.passkey}
                  isToggling={toggling === 'passkey'}
                  disabled={methods.passkey && activeCount === 1}
                  onToggle={(active) => handleToggleMethod('passkey', active)}
                />
              </>
            )}

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 mt-2">
              <p className="text-[#555] text-xs leading-relaxed">
                💡 Os métodos marcados ficam disponíveis como opção ao fazer login. O último método ativo não pode ser desativado para garantir o acesso à conta.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ===================== PASSWORD RESET SCREEN =====================

function PasswordResetScreen({ user, onSuccess, onCancel }: { user: User; onSuccess: () => void; onCancel: () => void }) {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPass.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    if (newPass !== confirmPass) { setError("As senhas não conferem"); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
    setLoading(false);
    if (updateError) { setError("Erro ao atualizar senha. Tente novamente."); return; }
    onSuccess();
  };

  return (
    <div className="w-full max-w-[420px]">
      <Card className="bg-[#0d0d1a] border-white/[0.07] overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/20 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white m-0">Nova Senha</h2>
              <p className="text-[#666] text-xs m-0">Olá, {user.name}! Defina sua nova senha.</p>
            </div>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm m-0">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                <input type={showNew ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={newPass} onChange={e => setNewPass(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                <input type={showConfirm ? "text" : "password"} placeholder="Repita a nova senha" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors" />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-60">
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? "Salvando..." : "Salvar Nova Senha"}
            </button>
            <button type="button" onClick={onCancel} className="w-full py-2.5 rounded-xl text-sm text-[#888] hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] transition-all cursor-pointer">
              Cancelar
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== DASHBOARD SCREEN =====================

interface DashboardScreenProps {
  user: User;
  onLogout: () => void;
  setCurrentUser: (u: User) => void;
}

function DashboardScreen({ user, onLogout, setCurrentUser }: DashboardScreenProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState<string>("visão geral");
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState<number>(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [valorReceita, setValorReceita] = useState("");
  const [gastoTab, setGastoTab] = useState<"normal" | "cartao">("normal");
  const [cardForm, setCardForm] = useState({ description: "", amount: "", category: "Alimentação", date: "", cardName: "", installments: "1" });
  const [descReceita, setDescReceita] = useState("");
  const [catReceita, setCatReceita] = useState("salario");
  const [dataReceita, setDataReceita] = useState(() => new Date().toISOString().split("T")[0]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);
  const [attachTarget, setAttachTarget] = useState<{ type: "expense" | "income"; id: number } | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const [investTab, setInvestTab] = useState<"radar" | "analise">("analise");
  const [formDueDate, setFormDueDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [userPhoto, setUserPhoto] = useState(user.photo || "");
  useEffect(() => { setUserPhoto(user.photo || ""); }, [user.photo]);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [showExtrato, setShowExtrato] = useState(false);
  const [extratoFiltroCategoria, setExtratoFiltroCategoria] = useState("todas");
  const [extratoFiltroTipo, setExtratoFiltroTipo] = useState<"ambos" | "gastos" | "receitas">("ambos");
  const [extratoMes, setExtratoMes] = useState(selectedMonth);

  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    description: "",
    category: "Alimentação",
    amount: "",
    date: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
  });

  const finance = useFinance(selectedMonth);
  const investments = useInvestments();
  const [investmentValue, setInvestmentValue] = useState("");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  const handleAttachClick = (type: "expense" | "income", id: number, existingAttachment?: string) => {
    if (existingAttachment) { window.open(existingAttachment, "_blank"); return; }
    setAttachTarget({ type, id });
    attachInputRef.current?.click();
  };

  const handleAttachFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = attachTarget;
    e.target.value = "";
    if (!file || !target) return;
    if (file.size > 5 * 1024 * 1024) { alert("Arquivo muito grande (máximo 5MB)"); return; }
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
        if (exp) finance.updateExpense({ ...exp, attachment: dataUrl, attachmentName: file.name } as Expense);
      } else {
        const inc = finance.incomeEntries.find(x => x.id === target.id);
        if (inc) finance.updateIncome({ ...inc, attachment: dataUrl, attachmentName: file.name });
      }
    } catch {
      alert("Erro ao processar o arquivo.");
    } finally {
      setAttachLoading(false);
      setAttachTarget(null);
    }
  };

  const handleAddExpense = async () => {
    if (await finance.addExpense({ ...form, due_date: formDueDate || null })) {
      setForm({
        description: "",
        category: "Alimentação",
        amount: "",
        date: `${currentYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`,
      });
      setFormDueDate("");
      setShowForm(false);
    }
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    setForm(prev => ({ ...prev, date: `${currentYear}-${String(month + 1).padStart(2, "0")}-01` }));
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

  const tabs = [
    { id: "visão geral",   label: "Visão Geral",   icon: PieIcon },
    { id: "gastos",        label: "Gastos",         icon: Receipt },
    { id: "investimentos", label: "Investimentos",  icon: TrendingUpIcon },
    { id: "histórico",     label: "Histórico",      icon: BarChart3 },
    { id: "metas",         label: "Metas",          icon: Target },
    { id: "relatórios",    label: "Relatórios",     icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#f0f0f0] font-sans">
      <div className="max-w-[800px] mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
              {userPhoto
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={userPhoto} alt="Perfil" className="w-full h-full object-cover" />
                : <User className="w-8 h-8 text-white" />}
            </div>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold m-0 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="RV Finanças" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
                <span className="bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">RV Finanças</span>
              </h1>
              <div className="flex items-center gap-2 mt-1 relative" ref={profileMenuRef}>
                <p className="text-[#888] text-[13px] m-0">Olá, <span className="text-orange-500 font-semibold">{user.name}</span>!</p>
                <button onClick={() => setShowProfileMenu(v => !v)} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] text-[#888] hover:text-white hover:bg-white/[0.05] transition-colors text-sm">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Perfil</span>
                </button>
                {showProfileMenu && (
                  <div className="absolute left-0 top-full mt-2 w-44 bg-[#0b0b14] border border-white/[0.07] rounded-lg shadow-lg py-1 z-50">
                    <button onClick={() => { setActiveTab("perfil"); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-[#888]" /> Editar perfil
                    </button>
                    <button onClick={() => { setShowProfileMenu(false); onLogout(); }} className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center gap-2 text-red-400">
                      <LogOut className="w-4 h-4" /> Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20" onClick={() => setShowForm(v => !v)}>
              <Plus className="w-4 h-4" /> Adicionar Gasto
            </button>
            <button onClick={() => { setExtratoMes(selectedMonth); setShowExtrato(true); }} className="bg-white/5 border border-white/10 text-[#ccc] hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2">
              <FileText className="w-4 h-4" /> <span>Extrato</span>
            </button>
            <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-md cursor-pointer">
              <PlusCircle className="w-4 h-4" /> <span>Adicionar Receita</span>
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <Card className="bg-white/[0.03] border-white/[0.07] mb-5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-[#888]" />
            <span className="text-[#888] text-xs uppercase tracking-wider font-medium">Período</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {MONTHS.map((m, i) => (
              <button key={m} className={`text-xs rounded-lg px-2.5 py-1.5 cursor-pointer transition-all border font-medium ${selectedMonth === i ? "bg-orange-500 border-orange-500 text-white font-bold shadow-md shadow-orange-500/20" : "bg-transparent border-white/10 text-[#888] hover:text-white hover:border-white/20"}`} onClick={() => handleMonthChange(i)}>
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
                      <Plus className="w-4 h-4 text-orange-500" /> Novo Lançamento
                    </CardTitle>
                    <button onClick={() => setShowForm(false)} className="text-[#888] hover:text-white transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex border-b border-white/[0.07]">
                    <button onClick={() => setGastoTab("normal")} className={`flex-1 py-2.5 text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${gastoTab === "normal" ? "text-white border-b-2 border-orange-500" : "text-[#888] hover:text-[#ccc]"}`}>
                      <Receipt className="w-3.5 h-3.5" /> Gasto
                    </button>
                    <button onClick={() => setGastoTab("cartao")} className={`flex-1 py-2.5 text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${gastoTab === "cartao" ? "text-white border-b-2 border-purple-500" : "text-[#888] hover:text-[#ccc]"}`}>
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
                            <option key={c.name} value={c.name} className="bg-[#1a1a2e]">{c.icon} {c.name}</option>
                          ))}
                        </select>
                        <input
                          className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full transition-colors"
                          type="date"
                          value={form.date}
                          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                        />
                        <div className="sm:col-span-2">
                          <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                            📅 Data de Vencimento <span className="normal-case text-[#555]">(opcional)</span>
                          </label>
                          <input
                            className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 w-full transition-colors"
                            type="date"
                            value={formDueDate}
                            onChange={e => setFormDueDate(e.target.value)}
                          />
                        </div>
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
                        <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full placeholder:text-[#666] transition-colors" placeholder="Descrição (ex: Compra Mercado)" value={cardForm.description} onChange={e => setCardForm(f => ({ ...f, description: e.target.value }))} />
                        <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full placeholder:text-[#666] transition-colors" type="number" placeholder="Valor total (R$)" value={cardForm.amount} onChange={e => setCardForm(f => ({ ...f, amount: e.target.value }))} />
                        <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full placeholder:text-[#666] transition-colors" placeholder="Nome do cartão (ex: Nubank)" value={cardForm.cardName} onChange={e => setCardForm(f => ({ ...f, cardName: e.target.value }))} />
                        <select className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full cursor-pointer transition-colors" value={cardForm.installments} onChange={e => setCardForm(f => ({ ...f, installments: e.target.value }))}>
                          {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={String(n)} className="bg-[#1a1a2e]">
                              {n === 1 ? "À vista (1x)" : `${n}x de ${cardForm.amount ? `R$ ${(parseFloat(cardForm.amount) / n).toFixed(2).replace(".", ",")}` : "–"}`}
                            </option>
                          ))}
                        </select>
                        <select className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full cursor-pointer transition-colors" value={cardForm.category} onChange={e => setCardForm(f => ({ ...f, category: e.target.value }))}>
                          {CATEGORIES.map(c => (
                            <option key={c.name} value={c.name} className="bg-[#1a1a2e]">{c.icon} {c.name}</option>
                          ))}
                        </select>
                        <input className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 w-full transition-colors" type="date" value={cardForm.date} onChange={e => setCardForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      {cardForm.amount && parseFloat(cardForm.amount) > 0 && parseInt(cardForm.installments) > 1 && (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2.5 mb-3 text-xs text-purple-300">
                          💳 {parseInt(cardForm.installments)}x de{" "}
                          <strong>R$ {(parseFloat(cardForm.amount) / parseInt(cardForm.installments)).toFixed(2).replace(".", ",")}</strong>
                          {" "}— Total: <strong>R$ {parseFloat(cardForm.amount).toFixed(2).replace(".", ",")}</strong>
                          {cardForm.cardName && ` — ${cardForm.cardName}`}
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
                            finance.addExpense({ description: desc, category: cardForm.category, amount: String(installmentValue.toFixed(2)), date: dateStr });
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
            <TabButton key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)} icon={t.icon} label={t.label} />
          ))}
        </div>

        {/* ===== VISÃO GERAL ===== */}
        {activeTab === "visão geral" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard title="Renda" value={formatBRL(finance.monthlyIncome)} color="#10B981" icon={PiggyBank} editable onEdit={() => setModalAberto(true)} />
              <StatCard title="Gastos" value={formatBRL(finance.totalExpenses)} color="#F97316" icon={TrendingDown} />
              <StatCard title="Saldo" value={formatBRL(finance.balance)} color={finance.balance >= 0 ? "#10B981" : "#EF4444"} icon={finance.balance >= 0 ? TrendingUp : TrendingDown} />
              <StatCard title="Economia" value={`${finance.savingsRate.toFixed(1)}%`} color={finance.savingsRate >= 20 ? "#10B981" : finance.savingsRate >= 10 ? "#EAB308" : "#EF4444"} icon={Target} />
            </div>
            <Card className="bg-white/[0.03] border-white/[0.07]">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] text-[#ccc] font-medium">Taxa de Economia</span>
                  <span className={`font-bold ${getSavingsTextColor(finance.savingsRate)}`}>{finance.savingsRate.toFixed(1)}%</span>
                </div>
                <div className="bg-white/[0.07] rounded-full h-2.5 overflow-hidden">
                  <div className={`h-2.5 rounded-full transition-all duration-700 ${getSavingsColor(finance.savingsRate)}`} style={{ width: `${Math.min(100, Math.max(0, finance.savingsRate))}%` }} />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {finance.savingsRate >= 20
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                  <p className="text-[#888] text-xs">
                    {finance.savingsRate >= 20
                      ? "Excelente! Continue assim — você está economizando bem."
                      : finance.savingsRate >= 10
                        ? "Bom progresso, mas ainda dá para melhorar."
                        : "Atenção: seus gastos estão altos. Tente reduzir."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {finance.tip && (
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-300 font-semibold text-sm mb-1">💡 Dica Financeira</p>
                    <p className="text-[#ccc] text-xs">
                      Sua maior despesa é em <strong>{finance.tip.categoryName}</strong> ({finance.tip.icon}), representando{" "}
                      <strong>{finance.tip.pct}%</strong> dos gastos. Reduzir 10% economizaria{" "}
                      <strong>{formatBRL(finance.tip.savings)}</strong> este mês.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {finance.byCategoryFiltered.length > 0 && (
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-orange-500" /> Gastos por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={finance.byCategoryFiltered} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3} stroke="none">
                        {finance.byCategoryFiltered.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(v) => <span className="text-[#ccc] text-xs">{v}</span>} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== GASTOS ===== */}
        {activeTab === "gastos" && (
          <div className="space-y-4">
            {(() => {
              const totalPending = finance.filtered.filter(e => e.status !== "paid").reduce((s, e) => s + e.amount, 0);
              const totalPaid    = finance.filtered.filter(e => e.status === "paid").reduce((s, e) => s + e.amount, 0);
              return (
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-yellow-500/10 border-yellow-500/20">
                    <CardContent className="p-3.5">
                      <p className="text-xs text-yellow-500 font-semibold mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> A Pagar</p>
                      <p className="text-lg font-bold text-yellow-400">{formatBRL(totalPending)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardContent className="p-3.5">
                      <p className="text-xs text-emerald-500 font-semibold mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Já Pago</p>
                      <p className="text-lg font-bold text-emerald-400">{formatBRL(totalPaid)}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            <div className="flex gap-2 flex-wrap">
              {(["all", "pending", "paid"] as const).map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${statusFilter === f ? "bg-orange-500 border-orange-500 text-white" : "bg-white/[0.03] border-white/10 text-[#888] hover:text-white"}`}>
                  {f === "all" ? "📋 Todos" : f === "pending" ? "⏳ Pendentes" : "✅ Pagos"}
                </button>
              ))}
            </div>

            {finance.sortedByCategory.length > 0 && (
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-orange-500" /> Por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {finance.sortedByCategory.map(c => (
                    <div key={c.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#ccc] flex items-center gap-1.5">{c.icon} {c.name}</span>
                        <span className="text-xs font-bold" style={{ color: c.color }}>{formatBRL(c.value)}</span>
                      </div>
                      <div className="bg-white/[0.07] rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${(c.value / finance.totalExpenses) * 100}%`, backgroundColor: c.color }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/[0.03] border-white/[0.07]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-500" />
                  Lançamentos ({finance.filtered.length + finance.filteredIncomes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const expFiltered = finance.filtered.filter(e =>
                    statusFilter === "all" ? true : statusFilter === "paid" ? e.status === "paid" : e.status !== "paid"
                  );
                  const incFiltered = finance.filteredIncomes.filter(e =>
                    statusFilter === "all" ? true : statusFilter === "paid" ? e.status === "paid" : e.status !== "paid"
                  );
                  const allItems = [
                    ...expFiltered.map(e => ({ ...e, _type: "expense" as const })),
                    ...incFiltered.map(e => ({ ...e, _type: "income" as const })),
                  ].sort((a, b) => +new Date(b.date) - +new Date(a.date));

                  if (allItems.length === 0)
                    return <p className="text-[#666] text-[13px] text-center py-4">Nenhum lançamento encontrado.</p>;

                  return (
                    <div className="space-y-0">
                      {allItems.map(item => {
                        if (item._type === "expense") {
                          const e = item as Expense & { _type: "expense" };
                          const cat = CATEGORIES.find(c => c.name === e.category);
                          const isEditing = editingExpense?.id === e.id;
                          const dueDateStatus = getDueDateStatus(e.due_date, e.status === "paid");

                          return (
                            <div key={`exp-${e.id}`} className="py-3.5 border-b border-white/[0.03] last:border-b-0">
                              {isEditing && editingExpense ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    className="col-span-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-3 py-2 text-sm outline-none focus:border-orange-500 placeholder:text-[#666]"
                                    value={editingExpense.description}
                                    onChange={ev => setEditingExpense({ ...editingExpense, description: ev.target.value })}
                                    placeholder="Descrição"
                                  />
                                  <input
                                    type="number"
                                    className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-3 py-2 text-sm outline-none focus:border-orange-500"
                                    value={editingExpense.amount}
                                    onChange={ev => setEditingExpense({ ...editingExpense, amount: parseFloat(ev.target.value) || 0 })}
                                  />
                                  <input
                                    type="date"
                                    className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-3 py-2 text-sm outline-none focus:border-orange-500"
                                    value={editingExpense.date}
                                    onChange={ev => setEditingExpense({ ...editingExpense, date: ev.target.value })}
                                  />
                                  <input
                                    type="date"
                                    className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-3 py-2 text-sm outline-none focus:border-orange-500"
                                    value={editingExpense.due_date ?? ""}
                                    onChange={ev => setEditingExpense({ ...editingExpense, due_date: ev.target.value || null })}
                                    placeholder="Vencimento"
                                  />
                                  <select
                                    className="col-span-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-[#f0f0f0] px-3 py-2 text-sm outline-none focus:border-orange-500"
                                    value={editingExpense.category}
                                    onChange={ev => setEditingExpense({ ...editingExpense, category: ev.target.value })}
                                  >
                                    {CATEGORIES.map(c => <option key={c.name} value={c.name} className="bg-[#1a1a2e]">{c.icon} {c.name}</option>)}
                                  </select>
                                  <button onClick={() => { finance.updateExpense(editingExpense); setEditingExpense(null); }} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-emerald-500/30 transition-all">
                                    <Check className="w-3 h-3" /> Salvar
                                  </button>
                                  <button onClick={() => setEditingExpense(null)} className="bg-white/5 text-[#888] border border-white/10 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-white/10 transition-all">
                                    <X className="w-3 h-3" /> Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{cat?.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm m-0 truncate">{e.description}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <p className="text-[#888] text-[11px] m-0">
                                        {e.category} — {new Date(e.date + "T00:00:00").toLocaleDateString("pt-BR")}
                                      </p>
                                      {e.status === "paid" ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">
                                          <CheckCircle2 className="w-2.5 h-2.5" />
                                          Pago{e.paid_at && ` — ${new Date(e.paid_at + "T00:00:00").toLocaleDateString("pt-BR")}`}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 font-semibold">
                                          <AlertTriangle className="w-2.5 h-2.5" /> Pendente
                                        </span>
                                      )}
                                      {e.due_date && dueDateStatus && dueDateStatus !== "ok" && (
                                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${
                                          dueDateStatus === "overdue"
                                            ? "bg-red-500/15 text-red-400 border-red-500/20"
                                            : dueDateStatus === "due-today"
                                              ? "bg-red-500/10 text-red-300 border-red-400/20"
                                              : "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
                                        }`}>
                                          {getDueDateLabel(dueDateStatus, e.due_date)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-bold text-sm whitespace-nowrap" style={{ color: cat?.color || "#F97316" }}>
                                    {formatBRL(e.amount)}
                                  </span>
                                  <button
                                    onClick={() => finance.markAsPaid("expense", e.id, e.status !== "paid")}
                                    title={e.status === "paid" ? "Desfazer pagamento" : "Marcar como pago"}
                                    className={`p-1.5 rounded-lg transition-all cursor-pointer border ${e.status === "paid" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400" : "bg-white/5 border-white/10 text-white/30 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400"}`}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleAttachClick("expense", e.id, e.attachment)} title={e.attachment ? "Ver comprovante" : "Anexar comprovante"} className="bg-transparent border-none text-white/20 hover:text-blue-400 cursor-pointer p-1.5 rounded-lg hover:bg-blue-500/10 transition-all">
                                    <Paperclip className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingExpense(e)} className="bg-transparent border-none text-white/20 hover:text-orange-400 cursor-pointer p-1.5 rounded-lg hover:bg-orange-500/10 transition-all">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => finance.removeExpense(e.id)} className="bg-transparent border-none text-white/20 hover:text-red-400 cursor-pointer p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          const e = item as IncomeEntry & { _type: "income" };
                          const isEditing = editingIncome?.id === e.id;
                          return (
                            <div key={`inc-${e.id}`} className="py-3.5 border-b border-white/[0.03] last:border-b-0">
                              {isEditing && editingIncome ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <input className="col-span-2 bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-3 py-2 text-sm outline-none focus:border-emerald-500 placeholder:text-[#666]" value={editingIncome.description} onChange={ev => setEditingIncome({ ...editingIncome, description: ev.target.value })} placeholder="Descrição" />
                                  <input type="number" className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-3 py-2 text-sm outline-none focus:border-emerald-500" value={editingIncome.amount} onChange={ev => setEditingIncome({ ...editingIncome, amount: parseFloat(ev.target.value) || 0 })} />
                                  <input type="date" className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-3 py-2 text-sm outline-none focus:border-emerald-500" value={editingIncome.date} onChange={ev => setEditingIncome({ ...editingIncome, date: ev.target.value })} />
                                  <select className="col-span-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-[#f0f0f0] px-3 py-2 text-sm outline-none focus:border-emerald-500" value={editingIncome.type} onChange={ev => setEditingIncome({ ...editingIncome, type: ev.target.value })}>
                                    <option value="salario" className="bg-[#1a1a2e]">💼 Salário</option>
                                    <option value="freelance" className="bg-[#1a1a2e]">💻 Freelance</option>
                                    <option value="investimento" className="bg-[#1a1a2e]">📈 Investimento</option>
                                    <option value="outro" className="bg-[#1a1a2e]">💰 Outro</option>
                                  </select>
                                  <button onClick={() => { finance.updateIncome(editingIncome); setEditingIncome(null); }} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-emerald-500/30 transition-all">
                                    <Check className="w-3 h-3" /> Salvar
                                  </button>
                                  <button onClick={() => setEditingIncome(null)} className="bg-white/5 text-[#888] border border-white/10 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-white/10 transition-all">
                                    <X className="w-3 h-3" /> Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">💰</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm m-0 truncate">{e.description}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <p className="text-[#888] text-[11px] m-0">
                                        Receita — {new Date(e.date + "T00:00:00").toLocaleDateString("pt-BR")}
                                      </p>
                                      {e.status === "paid" ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">
                                          <CheckCircle2 className="w-2.5 h-2.5" /> Recebido
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 font-semibold">
                                          <AlertTriangle className="w-2.5 h-2.5" /> A receber
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-bold text-sm whitespace-nowrap text-emerald-400">+{formatBRL(e.amount)}</span>
                                  <button onClick={() => finance.markAsPaid("income", e.id, e.status !== "paid")} title={e.status === "paid" ? "Desfazer recebimento" : "Marcar como recebido"} className={`p-1.5 rounded-lg transition-all cursor-pointer border ${e.status === "paid" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400" : "bg-white/5 border-white/10 text-white/30 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400"}`}>
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleAttachClick("income", e.id, e.attachment)} title={e.attachment ? "Ver comprovante" : "Anexar comprovante"} className="bg-transparent border-none text-white/20 hover:text-blue-400 cursor-pointer p-1.5 rounded-lg hover:bg-blue-500/10 transition-all">
                                    <Paperclip className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingIncome(e)} className="bg-transparent border-none text-white/20 hover:text-orange-400 cursor-pointer p-1.5 rounded-lg hover:bg-orange-500/10 transition-all">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => finance.removeIncome(e.id)} className="bg-transparent border-none text-white/20 hover:text-red-400 cursor-pointer p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== HISTÓRICO ===== */}
        {activeTab === "histórico" && (
          <div className="space-y-4">
            <Card className="bg-white/[0.03] border-white/[0.07]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-500" /> Evolução Mensal de Gastos
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
                      {finance.monthlyData.map((_, i) => <Cell key={i} fill={i === selectedMonth ? "#EC4899" : "#F97316"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-center text-[#666] text-xs mt-3">O mês atual ({MONTHS[selectedMonth]}) está destacado em rosa</p>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/[0.07]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" /> Tendência de Gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={finance.monthlyData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$ ${v}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
                    <Area type="monotone" dataKey="total" name="Gastos" stroke="#F97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== METAS ===== */}
        {activeTab === "metas" && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-orange-500/10 to-pink-500/10 border-orange-500/20">
              <CardContent className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" /> Metas de Gasto por Categoria
                </h3>
                <p className="text-[#888] text-xs">Defina limites de gasto para cada categoria e acompanhe seu progresso.</p>
              </CardContent>
            </Card>
            <div className="grid gap-3">
              {finance.budgetStatus.map(b => (
                <Card key={b.name} className="bg-white/[0.03] border-white/[0.07]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{b.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-white m-0">{b.name}</p>
                          <p className={`text-xs m-0 ${getBudgetStatusColor(b.pct)}`}>
                            {b.pct > 100 ? `Excedeu em ${formatBRL(b.spent - b.budget)}` : `${b.pct.toFixed(0)}% utilizado`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingBudget === b.name ? (
                          <div className="flex items-center gap-1.5">
                            <input className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-2 py-1 text-sm outline-none focus:border-orange-500 w-24 text-right" type="number" value={tempBudget} onChange={e => setTempBudget(parseFloat(e.target.value) || 0)} autoFocus />
                            <button className="text-emerald-500 hover:bg-emerald-500/10 p-1 rounded cursor-pointer transition-colors" onClick={() => { finance.updateBudget(b.name, tempBudget); setEditingBudget(null); }}>
                              <Check className="w-4 h-4" />
                            </button>
                            <button className="text-[#888] hover:bg-white/5 p-1 rounded cursor-pointer transition-colors" onClick={() => setEditingBudget(null)}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button className="flex items-center gap-1 text-[#888] hover:text-orange-500 text-xs font-medium transition-colors cursor-pointer" onClick={() => { setTempBudget(b.budget); setEditingBudget(b.name); }}>
                            {formatBRL(b.budget)} <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <Progress value={Math.min(100, b.pct)} className="h-2.5 bg-white/[0.07]" />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-[#888]">Gasto: <span className="font-semibold text-white">{formatBRL(b.spent)}</span></span>
                      <span className="text-xs text-[#888]">Restante: <span className={`font-semibold ${b.spent > b.budget ? "text-red-500" : "text-emerald-500"}`}>{formatBRL(b.budget - b.spent)}</span></span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ===== RELATÓRIOS ===== */}
        {activeTab === "relatórios" && (
          <div className="space-y-4">
            <Card className="bg-white/[0.03] border-white/[0.07]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-500" /> Comparativo Renda vs Gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={finance.incomeVsExpenses} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$ ${v}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-[#888] text-xs">{v}</span>} />
                    <Bar dataKey="renda" name="Renda" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {finance.byCategoryFiltered.length > 0 && (
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-orange-500" /> Distribuição de Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={finance.byCategoryFiltered} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3} stroke="none">
                        {finance.byCategoryFiltered.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(v) => <span className="text-[#ccc] text-xs">{v}</span>} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardContent className="p-4">
                  <p className="text-[#888] text-[11px] uppercase tracking-wider m-0">Total Gasto no Ano</p>
                  <p className="text-orange-500 font-bold text-lg m-0 mt-1">{formatBRL(finance.monthlyData.reduce((s, m) => s + m.total, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardContent className="p-4">
                  <p className="text-[#888] text-[11px] uppercase tracking-wider m-0">Média Mensal</p>
                  <p className="text-[#ccc] font-bold text-lg m-0 mt-1">{formatBRL(finance.monthlyData.reduce((s, m) => s + m.total, 0) / 12)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardContent className="p-4">
                  <p className="text-[#888] text-[11px] uppercase tracking-wider m-0">Maior Gasto</p>
                  <p className="text-red-500 font-bold text-lg m-0 mt-1">{formatBRL(Math.max(...finance.monthlyData.map(m => m.total)))}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/[0.07]">
                <CardContent className="p-4">
                  <p className="text-[#888] text-[11px] uppercase tracking-wider m-0">Menor Gasto</p>
                  <p className="text-emerald-500 font-bold text-lg m-0 mt-1">{formatBRL(Math.min(...finance.monthlyData.map(m => m.total)))}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ===== INVESTIMENTOS ===== */}
        {activeTab === "investimentos" && (
          <div className="space-y-4">
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              <button onClick={() => setInvestTab("radar")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${investTab === "radar" ? "bg-gradient-to-br from-purple-600 to-blue-500 text-white shadow-lg" : "text-[#888] hover:text-white"}`}>
                <RadarIcon className="w-4 h-4" /> Radar de Mercado
              </button>
              <button onClick={() => setInvestTab("analise")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${investTab === "analise" ? "bg-gradient-to-br from-purple-600 to-blue-500 text-white shadow-lg" : "text-[#888] hover:text-white"}`}>
                <Zap className="w-4 h-4" /> Análise IA
              </button>
            </div>

            {investTab === "radar" && <RadarTab />}

            {investTab === "analise" && (
              <>
                <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
                  <CardContent className="p-4 sm:p-5">
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <TrendingUpIcon className="w-4 h-4 text-purple-400" /> Análise de Investimentos com IA
                    </h3>
                    <p className="text-[#888] text-xs mb-4">Informe o valor disponível e receba recomendações personalizadas.</p>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Valor para investir (R$)" value={investmentValue} onChange={e => setInvestmentValue(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-purple-500 flex-1 placeholder:text-[#666] transition-colors" />
                      <button onClick={() => { const val = parseFloat(investmentValue); if (!isNaN(val) && val > 0) investments.analyze(val); }} disabled={investments.analyzing} className="bg-gradient-to-br from-purple-600 to-blue-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-60 whitespace-nowrap">
                        {investments.analyzing ? <><Loader className="w-4 h-4 animate-spin" /> Analisando...</> : <><Zap className="w-4 h-4" /> Analisar</>}
                      </button>
                    </div>
                    {investments.error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mt-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-red-400 text-sm m-0">{investments.error}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {investments.analyses.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#ccc] flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-400" /> Análises Recentes
                      </h3>
                      <button onClick={investments.clearHistory} className="text-xs text-[#888] hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Limpar histórico
                      </button>
                    </div>
                    {investments.analyses.map(analysis => (
                      <Card key={analysis.id} className="bg-white/[0.03] border-white/[0.07]">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-white font-bold text-sm">{formatBRL(analysis.value)}</p>
                              <p className="text-[#888] text-xs mt-0.5">{new Date(analysis.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            <button onClick={() => investments.deleteAnalysis(analysis.id)} className="text-white/20 hover:text-red-400 cursor-pointer p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {analysis.summary && (
                            <div className="bg-white/[0.03] rounded-xl px-3.5 py-2.5 mb-3 flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                              <p className="text-[#ccc] text-xs">{analysis.summary}</p>
                            </div>
                          )}
                          <div className="space-y-2.5">
                            {analysis.options.map((opt, i) => (
                              <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs flex items-center gap-1.5 font-medium text-[#ccc]">
                                    <span>{opt.icon}</span>
                                    {opt.label}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${opt.risk === "baixo" ? "bg-emerald-500/20 text-emerald-400" : opt.risk === "médio" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                                      {opt.risk}
                                    </span>
                                  </span>
                                  <div className="text-right">
                                    <span className="font-bold text-xs text-white">{opt.percentage}%</span>
                                    <span className="text-[#888] text-[10px] ml-1.5">{formatBRL(analysis.value * opt.percentage / 100)}</span>
                                  </div>
                                </div>
                                <div className="bg-white/[0.07] rounded-full h-1.5 overflow-hidden">
                                  <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${opt.percentage}%`, backgroundColor: opt.color }} />
                                </div>
                                <p className="text-[#666] text-[10px] mt-1 leading-relaxed">{opt.justification}</p>
                                {opt.expectedReturn && (
                                  <p className="text-[#888] text-[10px]">Retorno esperado: <span className="text-emerald-400 font-semibold">{opt.expectedReturn}</span></p>
                                )}
                              </div>
                            ))}
                          </div>
                          {analysis.marketContext && (
                            <div className="mt-3 pt-3 border-t border-white/[0.05] grid grid-cols-2 gap-2">
                              <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                                <p className="text-[#888] text-[10px] uppercase tracking-wider">BTC</p>
                                <p className="text-white font-bold text-xs mt-0.5">{formatBRL(analysis.marketContext.btcPrice)}</p>
                              </div>
                              <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                                <p className="text-[#888] text-[10px] uppercase tracking-wider">Sentimento</p>
                                <p className={`font-bold text-xs mt-0.5 ${analysis.marketContext.sentiment === "bullish" ? "text-emerald-400" : analysis.marketContext.sentiment === "bearish" ? "text-red-400" : "text-yellow-400"}`}>
                                  {analysis.marketContext.sentiment === "bullish" ? "🚀 Otimista" : analysis.marketContext.sentiment === "bearish" ? "🐻 Pessimista" : "⚖️ Neutro"}
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {investments.analyses.length === 0 && !investments.analyzing && (
                  <Card className="bg-white/[0.03] border-white/[0.07]">
                    <CardContent className="p-8 flex flex-col items-center text-center gap-3">
                      <TrendingUpIcon className="w-10 h-10 text-purple-400/40" />
                      <p className="text-[#888] text-sm">Nenhuma análise ainda. Informe um valor acima para começar.</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== PERFIL ===== */}
        {activeTab === "perfil" && (
          <PerfilPanel user={user} onUpdate={setCurrentUser} />
        )}

      </div>

      {/* Modal Adicionar Receita */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[480px]">
            <Card className="bg-white/[0.03] border-white/[0.07] overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[15px] font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Nova Receita
                  </CardTitle>
                  <button onClick={() => setModalAberto(false)} className="text-[#888] hover:text-white transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input type="text" placeholder="Descrição da receita" value={descReceita} onChange={e => setDescReceita(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 w-full placeholder:text-[#666] transition-colors" />
                  <input type="number" step="0.01" placeholder="Valor (R$)" value={valorReceita} onChange={e => setValorReceita(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 w-full placeholder:text-[#666] transition-colors" />
                  <select value={catReceita} onChange={e => setCatReceita(e.target.value)} className="bg-[#1a1a2e] border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 w-full cursor-pointer transition-colors">
                    <option value="salario" className="bg-[#1a1a2e]">💼 Salário</option>
                    <option value="freelance" className="bg-[#1a1a2e]">💻 Freelance</option>
                    <option value="investimento" className="bg-[#1a1a2e]">📈 Investimento</option>
                    <option value="outro" className="bg-[#1a1a2e]">💰 Outro</option>
                  </select>
                  <input type="date" value={dataReceita} onChange={e => setDataReceita(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 w-full transition-colors" />
                </div>
                <button
                  onClick={() => {
                    if (!valorReceita) return;
                    finance.addIncome(valorReceita, descReceita || "Receita", catReceita, dataReceita);
                    setValorReceita(""); setDescReceita(""); setCatReceita("salario");
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

      {/* Input escondido para anexos */}
      <input type="file" ref={attachInputRef} onChange={handleAttachFileChange} accept="image/*,application/pdf" className="hidden" />
      {attachLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white/[0.05] border border-white/10 rounded-xl px-6 py-4 flex items-center gap-3 text-sm text-[#ccc]">
            <Loader className="w-4 h-4 animate-spin" /> Enviando anexo...
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
                      <FileText className="w-4 h-4 text-orange-500" /> Extrato
                    </CardTitle>
                    <button onClick={() => setShowExtrato(false)} className="text-[#888] hover:text-white transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <select value={extratoMes} onChange={e => setExtratoMes(parseInt(e.target.value))} className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-2.5 py-2 text-xs outline-none focus:border-orange-500 cursor-pointer">
                      {MONTHS.map((m, i) => <option key={m} value={i} className="bg-[#0b0b14]">{m}</option>)}
                    </select>
                    <select value={extratoFiltroCategoria} onChange={e => setExtratoFiltroCategoria(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-2.5 py-2 text-xs outline-none focus:border-orange-500 cursor-pointer">
                      <option value="todas" className="bg-[#0b0b14]">Todas categorias</option>
                      {CATEGORIES.map(c => <option key={c.name} value={c.name} className="bg-[#0b0b14]">{c.icon} {c.name}</option>)}
                    </select>
                    <select value={extratoFiltroTipo} onChange={e => setExtratoFiltroTipo(e.target.value as "ambos" | "gastos" | "receitas")} className="bg-white/5 border border-white/10 rounded-lg text-[#f0f0f0] px-2.5 py-2 text-xs outline-none focus:border-orange-500 cursor-pointer">
                      <option value="ambos" className="bg-[#0b0b14]">Gastos e Receitas</option>
                      <option value="gastos" className="bg-[#0b0b14]">Só Gastos</option>
                      <option value="receitas" className="bg-[#0b0b14]">Só Receitas</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="overflow-y-auto flex-1 px-4 py-2">
                  {allItems.length === 0 ? (
                    <p className="text-[#666] text-sm text-center py-6">Nenhum lançamento encontrado.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#888] text-xs border-b border-white/[0.05]">
                          <th className="text-left py-2 font-medium">Data</th>
                          <th className="text-left py-2 font-medium">Descrição</th>
                          <th className="text-left py-2 font-medium hidden sm:table-cell">Categoria</th>
                          <th className="text-left py-2 font-medium">Tipo</th>
                          <th className="text-right py-2 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-white/[0.03]">
                            <td className="py-2.5 text-[#888] whitespace-nowrap text-xs">{new Date(item.date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                            <td className="py-2.5 text-[#f0f0f0] pr-2">{item.description}</td>
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
                  <div className="mt-4 pt-3 border-t border-white/[0.07] grid grid-cols-3 gap-2 text-center">
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
                  <button onClick={() => window.print()} className="w-full bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20">
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingSessionProfile, setPendingSessionProfile] = useState<User | null>(null);
  const [pendingSessionTokens, setPendingSessionTokens] = useState<{
    access_token: string;
    refresh_token: string;
  } | null>(null);
  const [showSession2FA, setShowSession2FA] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetSessionProfile, setResetSessionProfile] = useState<User | null>(null);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          if (profile.totp_secret) {
            setPendingSessionProfile(profile);
            setPendingSessionTokens({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
            setShowSession2FA(true);
          } else {
            setCurrentUser(profile);
          }
        }
      }
      setLoading(false);
      initialCheckDone.current = true;
    });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initialCheckDone.current && event === "SIGNED_IN") return;
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setPendingSessionProfile(null);
        setPendingSessionTokens(null);
        setShowSession2FA(false);
        setShowPasswordReset(false);
        setResetSessionProfile(null);
      }
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setResetSessionProfile(profile);
          setShowPasswordReset(true);
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (user: User) => setCurrentUser(user);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RV Finanças" className="w-16 h-16 object-contain animate-pulse" />
          <Loader className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (showPasswordReset && resetSessionProfile) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center px-4">
        <PasswordResetScreen
          user={resetSessionProfile}
          onSuccess={() => {
            setShowPasswordReset(false);
            setResetSessionProfile(null);
            setCurrentUser(resetSessionProfile);
          }}
          onCancel={async () => {
            await supabase.auth.signOut();
            setShowPasswordReset(false);
            setResetSessionProfile(null);
          }}
        />
      </div>
    );
  }

  if (showSession2FA && pendingSessionProfile) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        {pendingSessionTokens && (
          <TwoFactorLoginModal
            access_token={pendingSessionTokens.access_token}
            refresh_token={pendingSessionTokens.refresh_token}
            onSuccess={() => {
              setCurrentUser(pendingSessionProfile);
              setShowSession2FA(false);
              setPendingSessionProfile(null);
              setPendingSessionTokens(null);
            }}
            onCancel={() => {
              supabase.auth.signOut();
              setShowSession2FA(false);
              setPendingSessionProfile(null);
              setPendingSessionTokens(null);
            }}
          />
        )}
      </div>
    );
  }

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;

  return <DashboardScreen user={currentUser} onLogout={handleLogout} setCurrentUser={setCurrentUser} />;
}
