import type { Battle } from './store'
import { getExercise, MUSCLE_GROUPS } from './exercises'
import type { MuscleGroup } from './exercises'

/* ================================================================
   THE BODY'S BALANCE — how the week's iron is distributed across the
   frame. Each battle's volume is attributed to the regions its lift
   lights (primary in full, secondary at a share), summed over a rolling
   window. Surfaces neglected regions before an imbalance festers.
   ================================================================ */

const SECONDARY_SHARE = 0.4 // secondary regions earn a fraction of the volume (mirrors recovery.ts)
export const BALANCE_WINDOW_DAYS = 7
const DAY_MS = 86_400_000

export type BalanceMap = Record<MuscleGroup, number>

export function weeklyMuscleVolume(
  battles: Battle[],
  days = BALANCE_WINDOW_DAYS,
  now = Date.now()
): BalanceMap {
  const cutoff = now - days * DAY_MS
  const acc = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as BalanceMap
  for (const b of battles) {
    if (new Date(b.date).getTime() < cutoff) continue
    const heat = getExercise(b.movement)?.heat
    if (!heat) continue
    for (const g of heat.primary) acc[g] += b.volume
    for (const g of heat.secondary) acc[g] += b.volume * SECONDARY_SHARE
  }
  return acc
}

/** the least-tended region this week (lowest attributed volume); null if nothing trained */
export function neglectedRegion(bal: BalanceMap): MuscleGroup | null {
  const total = MUSCLE_GROUPS.reduce((t, g) => t + bal[g], 0)
  if (total <= 0) return null
  let min: MuscleGroup = MUSCLE_GROUPS[0]
  for (const g of MUSCLE_GROUPS) if (bal[g] < bal[min]) min = g
  return min
}
