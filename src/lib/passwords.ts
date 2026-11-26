// Password helpers copied from the web app's src/clubs.ts.
// This file does not touch storage. The club id is the SHA-256 of the trimmed password.

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generatePassword(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('')
}

export async function digestSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret.trim())
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
