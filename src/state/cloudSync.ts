/* ================================================================
   OPTIONAL ENCRYPTED CLOUD SYNC — a PROTOTYPE, off by default.

   Local-first stays the default: this does nothing unless the user
   opts in by setting an endpoint URL and entering a passphrase. The
   save is encrypted IN THE BROWSER (see crypto.ts) before it is sent,
   so the endpoint only ever stores ciphertext — a zero-knowledge design.
   The passphrase is never persisted or transmitted.

   The endpoint is whatever the user chooses (a personal server, a
   key/value bin, a signed storage URL). Push = PUT ciphertext,
   Pull = GET ciphertext. Anything speaking those two verbs works.
   ================================================================ */

import { encryptText, decryptText } from './crypto'
import { buildExport, parseImport, applySave } from './backup'

/** encrypt the current save (as a versioned envelope) and PUT it to the endpoint */
export async function pushToCloud(
  endpoint: string,
  passphrase: string,
  appVersion: string
): Promise<void> {
  assertHttps(endpoint)
  const envelope = buildExport(appVersion) // versioned plaintext envelope
  const ciphertext = await encryptText(envelope, passphrase)
  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: ciphertext,
    })
  } catch {
    throw new Error('Could not reach the sync endpoint. Check the URL and thy connection.')
  }
  if (!res.ok) throw new Error(`The sync endpoint refused the backup (HTTP ${res.status}).`)
}

/**
 * GET the ciphertext, decrypt, validate, and write it back locally.
 * The caller is responsible for reloading the app afterwards.
 */
export async function pullFromCloud(endpoint: string, passphrase: string): Promise<void> {
  assertHttps(endpoint)
  let res: Response
  try {
    res = await fetch(endpoint, { method: 'GET' })
  } catch {
    throw new Error('Could not reach the sync endpoint. Check the URL and thy connection.')
  }
  if (!res.ok) throw new Error(`Nothing could be pulled from the endpoint (HTTP ${res.status}).`)
  const ciphertext = (await res.text()).trim()
  if (!ciphertext) throw new Error('The endpoint returned nothing to restore.')
  const envelope = await decryptText(ciphertext, passphrase) // throws on wrong passphrase
  const saveString = parseImport(envelope) // validate + unwrap the envelope
  applySave(saveString)
}

/** never send data over plaintext transport */
function assertHttps(endpoint: string): void {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error('That is not a valid endpoint URL.')
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('For safety, the sync endpoint must use https.')
  }
}
