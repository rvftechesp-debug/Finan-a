// @/components/TwoFactorLoginModal.tsx
"use client";

import { useState } from "react";
import { verifyTotpCode } from "@/lib/totp";
import { ShieldCheck, AlertTriangle, Loader, KeyRound, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  secret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TwoFactorLoginModal({ secret, onSuccess, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleaned = code.replace(/\s/g, "");
    if (cleaned.length !== 6 || !/^\d{6}$/.test(cleaned)) {
      setError("Digite um código válido de 6 dígitos");
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const valid = verifyTotpCode(secret, cleaned);
    setLoading(false);

    if (!valid) {
      setError("Código inválido ou expirado. Tente novamente.");
      setCode("");
      return;
    }

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="bg-[#0d0d1a] border-white/[0.07] w-full max-w-[400px] overflow-hidden">
        <CardContent className="p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-white m-0">
                  Verificação em 2 Fatores
                </h2>
                <p className="text-[#666] text-xs m-0">
                  Abra o Google Authenticator e digite o código
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-[#888] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Ícone central */}
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <p className="text-[#888] text-sm text-center mb-5">
            Digite o código de <span className="text-white font-semibold">6 dígitos</span> gerado
            pelo seu aplicativo autenticador para continuar.
          </p>

          {/* Erro */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm m-0">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="text-xs text-[#888] uppercase tracking-wider font-medium mb-1.5 block">
                Código do Autenticador
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                <input
                  className="bg-white/5 border border-white/10 rounded-xl text-[#f0f0f0] pl-10 pr-4 py-3 text-sm outline-none focus:border-orange-500 w-full placeholder:text-[#666] transition-colors text-center tracking-[0.3em] font-mono text-base"
                  placeholder="000 000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold rounded-xl py-3 text-sm hover:opacity-85 transition-opacity w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {loading
                ? <Loader className="w-4 h-4 animate-spin" />
                : <ShieldCheck className="w-4 h-4" />
              }
              {loading ? "Verificando..." : "Confirmar Acesso"}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl text-sm text-[#888] hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
