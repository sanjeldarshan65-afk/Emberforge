import type { Battle } from './store'
import { localDayKey, MOVEMENTS } from './store'

/* ================================================================
   SIGILS OF THE FORGE — achievements, derived entirely from state
   ================================================================ */

export type SigilCtx = {
  battleCount: number
  prs: Record<string, number>
  prCount: number
  souls: number
  level: number
  maxStreak: number
  lifetimeVolume: number
  lifetimeSets: number
  routineCount: number
  proteinMetToday: boolean
}

export type Sigil = {
  id: string
  glyph: string
  name: string
  desc: string
  check: (c: SigilCtx) => boolean
}

/** longest run of consecutive battle days ever recorded */
export function maxStreak(battles: Battle[]): number {
  const days = [...new Set(battles.map((b) => localDayKey(b.date)))].sort()
  const num = (k: string) => {
    const [y, m, d] = k.split('-').map(Number)
    return Date.UTC(y, m - 1, d) / 86_400_000
  }
  let best = 0
  let run = 0
  let prev = Number.NaN
  for (const k of days) {
    const n = num(k)
    run = n - prev === 1 ? run + 1 : 1
    prev = n
    best = Math.max(best, run)
  }
  return best
}

export const SIGILS: Sigil[] = [
  { id: 'first-ember', glyph: '✦', name: 'First Ember', desc: 'Fight thy first battle', check: (c) => c.battleCount > 0 },
  { id: 'record-breaker', glyph: '♦', name: 'Record Breaker', desc: 'Set thy first personal record', check: (c) => c.prCount > 0 },
  { id: 'trinity', glyph: '⚔', name: 'Iron Trinity', desc: 'Records in Squat, Bench, and Deadlift', check: (c) => ['Squat', 'Bench Press', 'Deadlift'].every((m) => (c.prs[m] ?? 0) > 0) },
  { id: 'pentacle', glyph: '✪', name: 'Pentacle of Iron', desc: 'Records in all five great compounds', check: (c) => (MOVEMENTS as readonly string[]).every((m) => (c.prs[m] ?? 0) > 0) },
  { id: 'thrice-kindled', glyph: '☀', name: 'Thrice Kindled', desc: 'Forge a 3-day streak', check: (c) => c.maxStreak >= 3 },
  { id: 'sevenfold', glyph: '❂', name: 'Sevenfold Flame', desc: 'Forge a 7-day streak', check: (c) => c.maxStreak >= 7 },
  { id: 'soul-hoarder', glyph: '☉', name: 'Soul Hoarder', desc: 'Hold 50,000 souls at once', check: (c) => c.souls >= 50_000 },
  { id: 'cinder-lord', glyph: '♛', name: 'Lord of Cinder', desc: 'Reach level 10', check: (c) => c.level >= 10 },
  { id: 'mountain-mover', glyph: '▲', name: 'Mountain Mover', desc: 'Move 100,000 in lifetime tonnage', check: (c) => c.lifetimeVolume >= 100_000 },
  { id: 'centurion', glyph: '⚑', name: 'Centurion', desc: 'Vanquish 100 sets in thy lifetime', check: (c) => c.lifetimeSets >= 100 },
  { id: 'scribe', glyph: '✎', name: 'Scribe of War', desc: 'Inscribe a battle plan in the grimoire', check: (c) => c.routineCount > 0 },
  { id: 'feast', glyph: '❈', name: 'Covenant of the Feast', desc: 'Meet thy protein goal in a single day', check: (c) => c.proteinMetToday },
]
