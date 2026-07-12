import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeSave, isBattleLike } from '../src/state/sanitize.ts'

/* ================================================================
   SAVE SANITIZER — a damaged save costs at worst one field,
   never the whole legend.
   ================================================================ */

const DEFAULTS = {
  xp: 0,
  souls: 0,
  battles: [] as unknown[],
  claimedQuests: [] as string[],
  profile: null as null | { name: string },
  settings: { units: 'lb', sound: true },
  installDismissed: false,
  fatigue: () => 'derived',
}

test('a healthy save passes through untouched', () => {
  const out = sanitizeSave(
    { xp: 500, souls: 1200, battles: [{ ok: 1 }], profile: { name: 'A' } },
    DEFAULTS
  )
  assert.equal(out.xp, 500)
  assert.equal(out.souls, 1200)
  assert.deepEqual(out.battles, [{ ok: 1 }])
  assert.deepEqual(out.profile, { name: 'A' })
})

test('null / non-object / array blobs fall back to defaults entirely', () => {
  assert.deepEqual(sanitizeSave(null, DEFAULTS).xp, 0)
  assert.deepEqual(sanitizeSave('garbage', DEFAULTS).souls, 0)
  assert.deepEqual(sanitizeSave([1, 2], DEFAULTS).battles, [])
})

test('wrong-typed fields heal to defaults; the rest survive', () => {
  const out = sanitizeSave(
    { xp: 'NaN-ish', souls: 900, battles: null, claimedQuests: 'oops', installDismissed: 1 },
    DEFAULTS
  )
  assert.equal(out.xp, 0) // healed
  assert.equal(out.souls, 900) // kept
  assert.deepEqual(out.battles, []) // healed
  assert.deepEqual(out.claimedQuests, []) // healed
  assert.equal(out.installDismissed, false) // healed
})

test('non-finite numbers are rejected', () => {
  const out = sanitizeSave({ xp: Infinity, souls: NaN }, DEFAULTS)
  assert.equal(out.xp, 0)
  assert.equal(out.souls, 0)
})

test('object slots merge over their defaults so missing sub-fields heal', () => {
  const out = sanitizeSave({ settings: { units: 'kg' } }, DEFAULTS)
  assert.equal(out.settings.units, 'kg')
  assert.equal(out.settings.sound, true) // filled from defaults, not undefined
})

test('actions are never taken from storage', () => {
  const out = sanitizeSave({ fatigue: 'malicious string' }, DEFAULTS)
  assert.equal(typeof out.fatigue, 'function')
})

test('unknown keys in the blob are dropped', () => {
  const out = sanitizeSave({ hacked: true, xp: 10 }, DEFAULTS) as Record<string, unknown>
  assert.equal(out.hacked, undefined)
  assert.equal(out.xp, 10)
})

test('isBattleLike accepts a real battle and rejects wreckage', () => {
  assert.equal(
    isBattleLike({ date: new Date().toISOString(), sets: [], movement: 'Squat' }),
    true
  )
  assert.equal(isBattleLike(null), false)
  assert.equal(isBattleLike(42), false)
  assert.equal(isBattleLike({ date: 'not-a-date', sets: [], movement: 'Squat' }), false)
  assert.equal(isBattleLike({ date: new Date().toISOString(), sets: null, movement: 'Squat' }), false)
  assert.equal(isBattleLike({ date: new Date().toISOString(), sets: [] }), false)
})
