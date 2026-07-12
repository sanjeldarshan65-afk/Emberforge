/* ================================================================
   SAVE SANITIZER — self-healing rehydration.

   The save lives in localStorage, where extensions, quota pressure,
   manual editing, or a bad import can leave valid JSON with the
   wrong SHAPE (battles: null, souls: "abc"). Without a guard, that
   crashes the first render into the YOU DIED boundary on every
   load — a soft-lock. This module type-checks each persisted field
   against its default and silently drops anything malformed, so a
   damaged save costs at worst one field, never the whole legend.
   ================================================================ */

/**
 * Merge a persisted blob over `defaults`, keeping a persisted value only
 * when its type matches the default's. Functions (store actions) and
 * unknown keys are always taken from `defaults`. Pure — safe to test.
 */
export function sanitizeSave<T extends Record<string, unknown>>(persisted: unknown, defaults: T): T {
  if (!persisted || typeof persisted !== 'object' || Array.isArray(persisted)) {
    return { ...defaults }
  }
  const src = persisted as Record<string, unknown>
  const out: Record<string, unknown> = { ...defaults }

  for (const key of Object.keys(defaults)) {
    if (!(key in src)) continue
    const d = defaults[key]
    const v = src[key]
    if (typeof d === 'function') continue // actions never come from storage
    if (Array.isArray(d)) {
      if (Array.isArray(v)) out[key] = v
      continue
    }
    if (typeof d === 'number') {
      if (typeof v === 'number' && Number.isFinite(v)) out[key] = v
      continue
    }
    if (typeof d === 'boolean') {
      if (typeof v === 'boolean') out[key] = v
      continue
    }
    if (typeof d === 'string') {
      if (typeof v === 'string') out[key] = v
      continue
    }
    if (d === null) {
      // nullable slots (profile, lastDecay) accept null, objects, or strings
      out[key] = v === null || typeof v === 'object' || typeof v === 'string' ? v : null
      continue
    }
    if (typeof d === 'object') {
      // plain-object slots (vitals, settings, prs...) merge over their defaults
      // so a missing sub-field heals instead of becoming undefined
      if (v && typeof v === 'object' && !Array.isArray(v)) out[key] = { ...d, ...(v as object) }
      continue
    }
  }
  return out as T
}

/** minimal structural check for a persisted battle — enough that every
    consumer (statusEffects, fatigue, ledgers) can't throw on it */
export function isBattleLike(b: unknown): boolean {
  if (!b || typeof b !== 'object') return false
  const o = b as Record<string, unknown>
  return (
    typeof o.date === 'string' &&
    !Number.isNaN(new Date(o.date).getTime()) &&
    Array.isArray(o.sets) &&
    typeof o.movement === 'string'
  )
}
