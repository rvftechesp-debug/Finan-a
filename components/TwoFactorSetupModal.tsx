// @/components/TwoFactorSetupModal.tsx
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { generateOtpAuthUrl, verifyTotpCode } from "@/lib/totp";
import { ShieldCheck, AlertTriangle, Loader, KeyRound, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  secret: string;
  username: string;
  onSuccess: () => void;
}

export default function TwoFactorSetupModal({ secret, username, onSuccess }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const otpAuthUrl = generateOtpAuthUrl(secret, username);
    QRCode.toDataURL(otpAuthUrl, { width: 220, margin: 2, color: { dark: "#000", light: "#fff" } })
      .then(url => { setQrDataUrl(url); setQrLoading(false); })
      .catch(() => setQrLoading(false));
  }, [secret, username]);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement("textarea");
      el.value = secret;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

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
      <Card className="bg-[#0d0d1a] border-white/[0.07] w-full max-w-[420px] overflow-hidden">
        <CardContent className="p-6">

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white m-0">
                Configurar Autenticação em 2 Fatores
              </h2>
              <p className="text-[#666] text-xs m-0">
                Escaneie o QR Code ou copie o código manualmente
              </p>
            </div>
          </div>

          <div className="space-y-1.5 mb-5">
            {[
              "Abra o Google Authenticator no seu celular",
              'Toque em "+" → "Escanear QR Code" ou "Inserir chave"',
              "Escaneie o QR Code ou cole o código copiado",
              "Digite o código de 6 dígitos gerado",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[#aaa] text-sm m-0">{step}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-5">
            <div className="bg-white rounded-2xl p-3 inline-block shadow-xl">
              {qrLoading ? (
                <div className="w-[220px] h-[220px] flex items-center justify-center">
                  <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR Code 2FA" width={220} height={220} />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center text-red-400 text-sm text-center px-4">
                  Erro ao gerar QR Code
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-2">
            <p className="text-[#666] text-[11px] uppercase tracking-wider mb-2">
              Código para inserir manualmente:
            </p>
            <p className="text-orange-400 font-mono text-sm tracking-widest break-all text-center mb-3">
              {secret.match(/.{1,4}/g)?.join(" ")}
            </p>
            <button
              type="button"
              onClick={handleCopySecret}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                copied
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                  : "bg-white/5 border-white/10 text-[#ccc] hover:bg-white/10 hover:text-white"
              }`}
            >
              {copied
                ? <><Check className="w-4 h-4" /> Código copiado!</>
                : <><Copy className="w-4 h-4" /> Copiar código</>
              }
            </button>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
            <span className="text-blue-400 text-base leading-none mt-0.5">💡</span>
            <p className="text-blue-300 text-xs m-0">
              <span className="font-semibold">Usando o celular?</span> Copie o código acima,
              abra o Google Authenticator, toque em{" "}
              <span className="font-semibold">"+" → "Inserir chave de configuração"</span>{" "}
              e cole o código.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm m-0">{error}</p>
            </div>
          )}

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
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? "Verificando..." : "Verificar e Concluir Cadastro"}
            </button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
