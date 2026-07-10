/* ================================================================
   CLIENT-SIDE ENCRYPTION — zero-knowledge passphrase encryption for
   backups and the optional cloud sync. The passphrase never leaves the
   device and is never stored; only ciphertext is ever written to a file
   or sent to an endpoint. AES-256-GCM with a PBKDF2-derived key.
   ================================================================ */

const enc = new TextEncoder()
const dec = new TextDecoder()

const PBKDF2_ITERATIONS = 200_000

/** chunked base64 — plain btoa(String.fromCharCode(...bytes)) overflows the
    call stack for large saves, so encode in 32KB slices */
function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(s)
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export type EncryptedBlob = {
  app: string
  kind: 'emberforge-encrypted'
  v: number
  salt: string
  iv: string
  data: string
}

/** encrypt a plaintext string, returning a JSON blob safe to store anywhere */
export async function encryptText(plaintext: string, passphrase: string): Promise<string> {
  if (!passphrase) throw new Error('A passphrase is required to encrypt.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  const blob: EncryptedBlob = {
    app: 'EmberForge',
    kind: 'emberforge-encrypted',
    v: 1,
    salt: toB64(salt.buffer),
    iv: toB64(iv.buffer),
    data: toB64(cipher),
  }
  return JSON.stringify(blob)
}

/** decrypt a blob produced by encryptText; throws a clear error on wrong pass/corruption */
export async function decryptText(blobStr: string, passphrase: string): Promise<string> {
  let blob: EncryptedBlob
  try {
    blob = JSON.parse(blobStr)
  } catch {
    throw new Error('That is not a valid encrypted backup file.')
  }
  if (!blob || blob.kind !== 'emberforge-encrypted' || !blob.salt || !blob.iv || !blob.data) {
    throw new Error('This file is not an EmberForge encrypted backup.')
  }
  const key = await deriveKey(passphrase, fromB64(blob.salt))
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(blob.iv) },
      key,
      fromB64(blob.data)
    )
    return dec.decode(plain)
  } catch {
    throw new Error('Wrong passphrase, or the backup is corrupt.')
  }
}

export const isEncryptedBackup = (text: string): boolean => {
  try {
    return JSON.parse(text)?.kind === 'emberforge-encrypted'
  } catch {
    return false
  }
}
