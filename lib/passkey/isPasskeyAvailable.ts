// lib/passkey/isPasskeyAvailable.ts
export async function isPasskeyAvailable(): Promise<boolean> {
  try {
    if (
      !window.PublicKeyCredential ||
      !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ) {
      return false
    }

    const available =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()

    return available
  } catch {
    return false
  }
}
