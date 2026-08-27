// @/lib/totp.ts
import * as OTPAuth from "otpauth";

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/** Gera a URL otpauth:// para o QR Code */
export function generateOtpAuthUrl(secret: string, label = "rvfinanca"): string {
  const totp = new OTPAuth.TOTP({
    issuer: "RV Finança",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret), // <-- reusa o mesmo secret
  });
  return totp.toString(); // otpauth://totp/...
}
/** Valida o código TOTP informado pelo usuário */
export function validateTotp(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: "RV Finança",
    label: "rvfinanca",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.validate({ token, window: 1 }) !== null;
}
