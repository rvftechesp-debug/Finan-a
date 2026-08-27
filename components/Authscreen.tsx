"use client";

import { useState } from "react";
import {
  LogIn, UserPlus, Eye, EyeOff, Lock, User, Mail,
  KeyRound, ShieldCheck, Loader, AlertTriangle, CheckCircle2,
  Phone, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import { generateTotpSecret, validateTotp } from "@/lib/totp";
import TwoFactorLoginModal from "@/components/TwoFactorLoginModal";
import PasskeyLoginModal from "@/components/PasskeyLoginModal";
import {
  getEmailByUsername,
  getProfile,
  createProfile,
  updateProfile,
  type Profile,
} from "@/lib/supabaseProfile";
import { isPasskeyAvailable } from "@/lib/passkey/isPasskeyAvailable";
import { registerPasskey } from "@/lib/passkey/register";
import CoinLoader from '@/components/CoinLoader';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function AuthScreen({ onLogin, isBlocked }: { onLogin: (user: Profile) => void; isBlocked?: boolean }) {
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
  const [coinNext, setCoinNext] = useState<(() => void) | null>(null);

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
  setTotpSecret("");
  if (pendingProfile) {
    const profile = pendingProfile;
    registrarAcesso(profile.id);
    setCoinNext(() => () => onLogin(profile)); // 🪙 mostra moeda, depois entra
  }
  setPendingProfile(null);
};

const handle2FALoginSuccess = () => {
  setShow2FALogin(false);
  setPendingTokens(null);
  if (pendingLoginProfile) {
    const profile = pendingLoginProfile;
    registrarAcesso(profile.id);
    setCoinNext(() => () => onLogin(profile)); // 🪙
  }
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
  if (pendingLoginProfile) {
    const profile = pendingLoginProfile;
    registrarAcesso(profile.id);
    setCoinNext(() => () => onLogin(profile)); // 🪙
  }
};

  const handlePasskeyLoginCancel = async () => {
    await supabase.auth.signOut();
    setShowPasskeyLogin(false);
    setPendingLoginProfile(null);
    setError("Autenticação cancelada.");
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
    // 1. Verifica se o usuário já existe
    const emailExistente = await getEmailByUsername(regUser.trim().toLowerCase());
    if (emailExistente) { setError("Este nome de usuário já está em uso"); return; }

    // 2. Cria o usuário no auth.users
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: regEmail.trim().toLowerCase(),
      password: regPass.trim(),
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Erro ao criar conta. Tente novamente.");
      return;
    }

    // 3. Monta e cria o profile
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

    // 4. Gera e salva o secret do TOTP (2FA)
    const secret = generateTotpSecret();
    setTotpSecret(secret);
    setPendingProfile(novoProfile);

    await updateProfile(novoProfile.id, { totp_secret: secret });

   // Passo 5 - TOTP
const { error: totpMethodError } = await supabase
  .from('user_auth_methods')
  .upsert(
    {
      userId: novoProfile.id,  
      method: 'totp',
      isActive: true,         
     
    },
    { onConflict: 'userId,method', ignoreDuplicates: false }
  );

if (totpMethodError) {
  console.error("Erro TOTP:", totpMethodError.message, totpMethodError.code);
  setError("Erro ao configurar 2FA.");
  return;
}


    // 6. Oferece cadastro de passkey/biometria (se o dispositivo suportar)
    if (await isPasskeyAvailable()) {
      try {
        await registerPasskey(novoProfile.id);

        // Passkey cadastrada com sucesso → ativa o método
     await supabase.from('user_auth_methods').upsert(
  {
    userId: novoProfile.id,   // ✅
    method: 'passkey',
    isActive: true,           // ✅
  },
  { onConflict: 'userId,method', ignoreDuplicates: false }
);

      } catch {
        // Usuário cancelou ou o dispositivo negou a biometria.
        // Não é erro fatal: segue apenas com senha + 2FA.
      }
    }

    // 7. Abre o modal de configuração do 2FA
    setShow2FAModal(true);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro inesperado.";
    setError(msg);
  } finally {
    setLoading(false); // 🔧 corrige o loading travado
  }
};

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
      const { data: profileRow, error: profileError } = await supabase
        .from("users")
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

const valid = validateTotp(profileRow.totp_secret, forgotTotpCode);
if (!valid) {
  setForgotError("Código 2FA inválido ou expirado. Tente novamente.");
  return;
}


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
const registrarAcesso = async (id: string) => {
  await supabase
    .from("users")
    .update({ last_access: new Date().toISOString() })
    .eq("id", id);
};

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setSuccess("");

  if (!loginUser.trim()) { setError("Digite seu usuário"); return; }
  if (!loginPass.trim()) { setError("Digite sua senha"); return; }

  setLoading(true);
  try {
    const email = await getEmailByUsername(loginUser.trim().toLowerCase());
    if (!email) {
      setError("Usuário ou senha inválidos");
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: loginPass.trim(),
    });

    if (signInError || !data.session || !data.user) {
      setError("Usuário ou senha inválidos");
      return;
    }

    const profile = await getProfile(data.user.id);
    if (!profile) {
      await supabase.auth.signOut();
      setError("Perfil não encontrado. Contate o suporte.");
      return;
    }

    // 4. Se tem 2FA (TOTP)
    if (profile.totp_secret) {
      setPendingLoginProfile(profile);
      setPendingTokens({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // Se passkey estiver disponível/ativa, prioriza
      if (await isPasskeyAvailable()) {
        const { data: methods } = await supabase
          .from("user_auth_methods")
          .select("method, isActive")
          .eq("userId", profile.id)
          .eq("method", "passkey")
          .eq("isActive", true)
          .maybeSingle();

        if (methods) {
          setShowPasskeyLogin(true);
          return;
        }
      }

      // Sem passkey → abre modal TOTP
      setShow2FALogin(true);
      return;
    } // 🔧 fecha o if (profile.totp_secret)

    // 5. Sem 2FA → login direto
    await registrarAcesso(profile.id);
    setCoinNext(() => () => onLogin(profile));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro inesperado ao entrar.";
    setError(msg);
  } finally {
    setLoading(false);
  }
};

if (coinNext) {
  return <CoinLoader onFinish={coinNext} />;
}

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
            username={pendingProfile.username ?? ""}
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

        {/* 🚫 Aviso de conta bloqueada */}
        {isBlocked && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-400 text-sm m-0">
              🚫 Sua conta foi bloqueada. Entre em contato com o suporte.
            </p>
          </div>
        )}

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

export default AuthScreen;
