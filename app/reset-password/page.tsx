"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ready, setReady] = useState(false);

  // Supabase injeta a sessão via hash na URL após o clique no email
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPass.trim()) { setError("Digite a nova senha"); return; }
    if (newPass.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    if (newPass !== confirmPass) { setError("As senhas não conferem"); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPass.trim(),
      });

      if (updateError) {
        setError("Erro ao redefinir senha. O link pode ter expirado.");
        return;
      }

      setSuccess("Senha redefinida com sucesso! Redirecionando...");
      setTimeout(() => router.push("/"), 2000);
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
          <p className="text-[#888] text-sm mt-2">Redefinição de senha</p>
        </div>

        <Card className="bg-white/[0.03] border-white/[0.07] overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            {/* Ícone de destaque */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/20 flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-orange-500" />
              </div>
            </div>

            {!ready ? (
              // Aguardando o evento PASSWORD_RECOVERY do Supabase
              <div className="text-center space-y-3">
                <Loader className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
                <p className="text-[#888] text-sm">Validando link de redefinição...</p>
                <p className="text-[#555] text-xs">
                  Se nada acontecer, o link pode ter expirado.{" "}
                  <button
                    onClick={() => router.push("/")}
                    className="text-orange-500 hover:underline cursor-pointer"
                  >
                    Voltar ao login
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-[#888] text-sm text-center mb-2">
                  Escolha uma nova senha para sua conta.
                </p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-red-400 text-sm m-0">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-emerald-400 text-sm m-0">{success}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                    <input
                      type={showNew ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer transition-colors"
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
                      className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-10 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white cursor-pointer transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-60"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Salvar Nova Senha
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-[#666] hover:text-[#999] text-sm w-full text-center transition-colors cursor-pointer"
                >
                  ← Voltar ao login
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
