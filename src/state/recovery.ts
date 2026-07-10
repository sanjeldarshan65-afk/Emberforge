import type { Battle } from './store'
import { getExercise, MUSCLE_GROUPS } from './exercises'
import type { MuscleGroup } from './exercises'

/* ================================================================
   MUSCLE RECOVERY — damage from battle volume, healed by time
   Fatigue is derived purely from battle history: no extra state,
   no drift, always consistent with the log.
   ================================================================ */

export { MUSCLE_GROUPS }
export type { MuscleGroup }
export type FatigueMap = Record<MuscleGroup, number>

export const RECOVERY_HOURS = 48 // a torched muscle fades back to gold outline over ~48h
const REF_VOLUME = 10_000 // volume that fully torches a muscle in one session
const SECONDARY_SHARE = 0.4

/** 0 = fully rested, 1 = aflame */
export function muscleFatigue(battles: Battle[]): FatigueMap {
  const now = Date.now()
  const acc = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as FatigueMap

  for (const b of battles) {
    const hours = (now - new Date(b.date).getTime()) / 3_600_000
    if (hours >= RECOVERY_HOURS || hours < 0) continue
    const heat = getExercise(b.movement)?.heat
    if (!heat) continue
    const freshness = 1 - hours / RECOVERY_HOURS // linear cool-down
    const damage = (b.volume / REF_VOLUME) * freshness
    for (const g of heat.primary) acc[g] += damage
    for (const g of heat.secondary) acc[g] += damage * SECONDARY_SHARE
  }

  for (const g of MUSCLE_GROUPS) acc[g] = Math.min(1, acc[g])
  return acc
}

export const recoveryHoursLeft = (fatigue: number) => Math.ceil(fatigue * RECOVERY_HOURS)

export const fatigueLabel = (f: number) =>
  f < 0.12
    ? 'Rested — the ember sleeps'
    : f < 0.4
      ? 'Tempered — lightly worked'
      : f < 0.7
        ? 'Fatigued — the fire lingers'
        : 'Heavily Fatigued — aflame'
