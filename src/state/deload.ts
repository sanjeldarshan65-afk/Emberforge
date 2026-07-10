import type { Battle } from './store'
import { getExercise } from './exercises'
import type { FatigueMap, MuscleGroup } from './recovery'

/* ================================================================
   THE FADING FLAME — auto-deload detection.
   Overreaching is read as a lift whose estimated 1RM has NOT
   progressed across its last DELOAD_LOOKBACK sessions, while the
   muscle it drives still burns at or above DELOAD_FATIGUE. When both
   hold, the forge counsels banking the coals: lighter load, fewer sets.
   ================================================================ */

export const DELOAD_LOOKBACK = 3 // sessions of a lift to inspect
export const DELOAD_FATIGUE = 0.6 // primary-muscle fatigue that counts as "hot"
export const DELOAD_LOAD_CUT = 0.9 // recommend -10% working load
export const DELOAD_SET_CUT = 1 // recommend -1 set

export type DeloadFlag = {
  movement: string
  primary: MuscleGroup
  fatigue: number
  lastTopWeight: number
  lastSets: number
  suggestedTopWeight: number
  suggestedSets: number
}

/** Battles are stored newest-first; this preserves that order per lift. */
export function detectDeload(battles: Battle[], fatigue: FatigueMap): DeloadFlag[] {
  const byMove = new Map<string, Battle[]>()
  for (const b of battles) {
    const arr = byMove.get(b.movement)
    if (arr) arr.push(b)
    else byMove.set(b.movement, [b])
  }

  const flags: DeloadFlag[] = []
  for (const [movement, list] of byMove) {
    if (list.length < DELOAD_LOOKBACK) continue
    const recent = list.slice(0, DELOAD_LOOKBACK) // newest first

    // stalled: the newest e1RM fails to beat the best of the prior sessions
    const e1rms = recent.map((b) => b.e1rm)
    const stalled = e1rms[0] <= Math.max(...e1rms.slice(1))
    if (!stalled) continue

    const primary = getExercise(movement)?.heat.primary[0]
    if (!primary) continue

    const f = fatigue[primary] ?? 0
    if (f < DELOAD_FATIGUE) continue

    const lastTop = recent[0].topWeight
    const lastSets = recent[0].sets.length
    flags.push({
      movement,
      primary,
      fatigue: f,
      lastTopWeight: lastTop,
      lastSets,
      suggestedTopWeight: Math.round((lastTop * DELOAD_LOAD_CUT) / 5) * 5, // nearest 5
      suggestedSets: Math.max(1, lastSets - DELOAD_SET_CUT),
    })
  }
  return flags
}
