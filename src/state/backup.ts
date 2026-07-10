/* ================================================================
   DATA SAFETY — export/import, rolling local backups, export nudge.

   EmberForge is local-first: the save lives in localStorage and never
   leaves the device by default. That is convenient but fragile — a
   cache clear wipes everything. This module hardens the story:
     • a versioned export ENVELOPE (not a bare zustand blob)
     • strict, descriptive import validation (new + legacy formats)
     • automatic rolling snapshots (guards against in-app corruption
       and lets you roll back a bad state)
     • a gentle reminder to export a real off-device copy
   ================================================================ */

const SAVE_KEY = 'emberforge-save'
const BACKUP_KEY = 'emberforge-backups'
const LAST_EXPORT_KEY = 'emberforge-last-export'

export const EXPORT_KIND = 'emberforge-save'
export const EXPORT_VERSION = 1

const MAX_BACKUPS = 8
const BACKUP_INTERVAL_MS = 12 * 60 * 60 * 1000 // snapshot at most twice a day
const EXPORT_REMINDER_MS = 7 * 24 * 60 * 60 * 1000 // nudge weekly

export type ExportEnvelope = {
  app: string
  kind: string
  version: number
  appVersion: string
  exportedAt: string
  save: unknown // the parsed zustand persist blob: { state, version }
}

export type LocalBackup = {
  id: string
  at: number
  appVersion: string
  bytes: number
  save: string // raw zustand blob string
}

export const currentSaveRaw = (): string | null => localStorage.getItem(SAVE_KEY)

/** wrap the raw save in a versioned, self-describing envelope */
export function buildExport(appVersion: string): string {
  const raw = currentSaveRaw()
  if (!raw) throw new Error('There is no save to preserve yet.')
  let save: unknown
  try {
    save = JSON.parse(raw)
  } catch {
    // even a corrupt blob is worth exporting verbatim so nothing is lost
    save = raw
  }
  const env: ExportEnvelope = {
    app: 'EmberForge',
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    save,
  }
  return JSON.stringify(env, null, 2)
}

/**
 * Validate an imported file and return the inner zustand blob STRING to
 * write back to localStorage. Accepts the new envelope AND a legacy raw
 * blob. Throws a human-readable error for anything else.
 */
export function parseImport(text: string): string {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!data || typeof data !== 'object') {
    throw new Error('That file is empty or malformed.')
  }
  const obj = data as Record<string, unknown>

  // new envelope format
  if (obj.kind === EXPORT_KIND && 'save' in obj) {
    const save = obj.save
    if (typeof save === 'string') {
      // corrupt-blob passthrough that was exported verbatim
      if (!save.includes('"state"')) throw new Error('The backup envelope holds no save data.')
      return save
    }
    if (!save || typeof save !== 'object' || !('state' in (save as object))) {
      throw new Error('The backup envelope holds no save data.')
    }
    return JSON.stringify(save)
  }

  // legacy: a bare zustand persist blob { state, version }
  if ('state' in obj) return JSON.stringify(obj)

  throw new Error('This does not look like an EmberForge backup.')
}

/** write a validated save blob back to storage (caller reloads the app) */
export function applySave(saveString: string): void {
  localStorage.setItem(SAVE_KEY, saveString)
}

/* ---------------- rolling local backups ---------------- */

export function listBackups(): LocalBackup[] {
  try {
    const a = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]')
    return Array.isArray(a) ? (a as LocalBackup[]) : []
  } catch {
    return []
  }
}

/**
 * Take a snapshot if enough time has passed and the save actually changed.
 * Returns true if a snapshot was written. Quota-safe: on overflow it trims
 * to the newest few and retries once.
 */
export function snapshotBackup(appVersion: string, force = false): boolean {
  const raw = currentSaveRaw()
  if (!raw) return false
  const backups = listBackups()
  const last = backups[0]
  if (!force && last && Date.now() - last.at < BACKUP_INTERVAL_MS) return false
  if (last && last.save === raw) return false // nothing changed since last snapshot

  const snap: LocalBackup = {
    id: `${Date.now()}`,
    at: Date.now(),
    appVersion,
    bytes: raw.length,
    save: raw,
  }
  const next = [snap, ...backups].slice(0, MAX_BACKUPS)
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(next))
    return true
  } catch {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify([snap, ...backups.slice(0, 2)]))
      return true
    } catch {
      return false // storage full even after trimming — never throw from a background snapshot
    }
  }
}

export function restoreBackup(id: string): boolean {
  const b = listBackups().find((x) => x.id === id)
  if (!b) return false
  applySave(b.save)
  return true
}

export function deleteBackup(id: string): void {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(listBackups().filter((b) => b.id !== id)))
}

/* ---------------- export reminder ---------------- */

export const markExported = (): void => localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()))

export function lastExportAt(): number | null {
  const v = localStorage.getItem(LAST_EXPORT_KEY)
  return v ? Number(v) : null
}

/** true if the user has never exported, or not in over a week */
export function needsExportReminder(): boolean {
  const t = lastExportAt()
  return t === null || Date.now() - t > EXPORT_REMINDER_MS
}
