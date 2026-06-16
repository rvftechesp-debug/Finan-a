// @/lib/totp.ts
import * as OTPAuth from "otpauth";

/** Gera um secret TOTP aleatório (base32) */
export function generateTotpSecret(): string {
  const totp = new OTPAuth.TOTP({
    issuer: "RV Finança",
    label: "rvfinanca",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
  return totp.secret.base32;
}

/** Gera a URL otpauth:// para o QR Code */
export function generateOtpAuthUrl(secret: string, username: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: "RV Finança",
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

/** Valida o código TOTP informado pelo usuário */
export function verifyTotpCode(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: "RV Finança",
    label: "rvfinanca",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}
