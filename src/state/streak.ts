import type { Battle } from './store'
export type { Battle } from './store'

/* ================================================================
   THE UNBROKEN CHAIN — day math, streak derivation, status effects,
   and the Ember Bank's constants. A runtime-leaf module (type-only
   relative imports) so node's test runner can load it directly;
   store.ts re-exports everything here for the rest of the app.
   ================================================================ */

/* ---------- date helpers ---------- */
/** local YYYY-MM-DD for any ISO date */
export const localDayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA')

/** local YYYY-MM-DD for today — ration totals + curse decay reset daily */
export const todayKey = () => new Date().toLocaleDateString('en-CA')

/** absolute day number from a YYYY-MM-DD key (safe for date math) */
export const dayNum = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** YYYY-MM-DD key from an absolute day number — dayNum's inverse */
export const keyFromDayNum = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)

/* ---------- status tuning ---------- */
export const ASCEND_STREAK = 3      // consecutive workout days for the buff
export const ASCEND_MULT = 1.2      // souls multiplier while ascended
export const CURSE_AFTER_DAYS = 4   // idle days before the Curse of Hollowing takes hold
export const CURSE_DRAIN = 0.02     // souls drained per cursed (hollowed) day

/* The Ember Bank — streak insurance. Bank an ember for souls; when a rest day
   would break the chain, one burns in thy stead (automatically, on next visit). */
export const EMBER_BANK_COST = 5000
export const EMBER_BANK_MAX = 2

/* ---------- status effects (pure, derived from battle history) ---------- */
export type StatusEffects = {
  streak: number              // consecutive workout days ending today/yesterday
  daysSinceLast: number | null
  ascended: boolean
  cursed: boolean
}

/**
 * Derive streak/buffs from battle history. `burns` are day-keys covered by a
 * burned banked ember: they bridge the chain (the streak survives across them)
 * but only true battle days add to the count. The Curse of Hollowing reads raw
 * idle days — an ember shields the streak, not the curse.
 */
export function statusEffects(battles: Battle[], burns: string[] = []): StatusEffects {
  const battleDays = [...new Set(battles.map((b) => localDayKey(b.date)))] // newest first
  if (battleDays.length === 0) {
    return { streak: 0, daysSinceLast: null, ascended: false, cursed: false }
  }

  const daysSinceLast = dayNum(todayKey()) - dayNum(battleDays[0])

  /* the chain walks battle days and burn days alike; it must reach today or yesterday */
  const battleSet = new Set(battleDays)
  const chainDays = [...new Set([...battleDays, ...burns])].sort((a, b) => dayNum(b) - dayNum(a))
  let streak = 0
  if (dayNum(todayKey()) - dayNum(chainDays[0]) <= 1) {
    streak = battleSet.has(chainDays[0]) ? 1 : 0
    for (let i = 1; i < chainDays.length; i++) {
      if (dayNum(chainDays[i - 1]) - dayNum(chainDays[i]) !== 1) break
      if (battleSet.has(chainDays[i])) streak++
    }
  }

  return {
    streak,
    daysSinceLast,
    ascended: streak >= ASCEND_STREAK,
    cursed: daysSinceLast >= CURSE_AFTER_DAYS,
  }
}
