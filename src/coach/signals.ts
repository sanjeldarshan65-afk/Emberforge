import type { Battle } from '../state/store'
import type { FatigueMap } from '../state/recovery'

/* ================================================================
   COACH SIGNALS — Layer A of the Fire Keeper pipeline (see
   docs/fire-keeper-adaptive-coaching.md). Pure data → data:
   deterministic, on-device, unit-tested in tests/coach.test.ts.
   The narrator (ai/fireKeeper.ts) only PHRASES what this computes.

   Runtime-dependency-free by design (type-only imports), so the
   node test runner loads it directly. Catalog knowledge (primary
   muscle, strength standard per lift) is injected by the caller.
   ================================================================ */

export const STALL_LOOKBACK = 3
export const VELOCITY_LOOKBACK = 5
export const DELOAD_FATIGUE = 0.6
export const DELOAD_LOAD_CUT = 0.9
const DAY = 86_400_000

export type CoachLookups = {
  primaryOf: (movement: string) => string | undefined
  standardOf: (movement: string) => number | undefined
}

export type NextMove =
  | { kind: 'advance'; addWeight: number }
  | { kind: 'hold' }
  | { kind: 'deload'; toWeight: number; toSets: number }

export type LiftSignal = {
  movement: string
  sessions: number
  lastTopWeight: number
  lastTopReps: number
  bestE1rm: number
  lastE1rm: number
  velocity: number
  spanDays: number
  stallLen: number
  stalled: boolean
  fatigue: number
  nextMove: NextMove
}

export type Adherence = {
  daysSinceLast: number
  battlesLast14: number
  battlesLast42: number
  drifting: boolean
}

export type CoachSignals = {
  lifts: LiftSignal[]
  weakest?: { movement: string; pr: number; target: number; pct: number }
  deloads: LiftSignal[]
  adherence: Adherence
  focus?: LiftSignal
}

const daysBetween = (aIso: string, bIso: string) =>
  Math.abs(new Date(aIso).getTime() - new Date(bIso).getTime()) / DAY

export function readSignals(
  battles: Battle[],
  prs: Record<string, number>,
  bodyweight: number,
  fatigue: FatigueMap,
  units: string,
  lookups: CoachLookups,
  now: Date = new Date()
): CoachSignals {
  const increment = units === 'kg' ? 2.5 : 5
  const roundInc = units === 'kg' ? 2.5 : 5

  const byMove = new Map<string, Battle[]>()
  for (const b of battles) {
    const arr = byMove.get(b.movement)
    if (arr) arr.push(b)
    else byMove.set(b.movement, [b])
  }

  const lifts: LiftSignal[] = []
  for (const [movement, list] of byMove) {
    const window = list.slice(0, VELOCITY_LOOKBACK)
    const bestE1rm = Math.max(...list.map((b) => b.e1rm))
    let stallLen = 0
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].e1rm === bestE1rm) {
        stallLen = i
        break
      }
    }
    const stalled = list.length >= STALL_LOOKBACK && stallLen >= STALL_LOOKBACK - 1

    const recent = list.slice(0, STALL_LOOKBACK)
    const windowStalled =
      list.length >= STALL_LOOKBACK && recent[0].e1rm <= Math.max(...recent.slice(1).map((b) => b.e1rm))

    const primary = lookups.primaryOf(movement)
    const f = primary ? ((fatigue as Record<string, number>)[primary] ?? 0) : 0

    const nextMove: NextMove =
      windowStalled && f >= DELOAD_FATIGUE
        ? {
            kind: 'deload',
            toWeight: Math.round((list[0].topWeight * DELOAD_LOAD_CUT) / roundInc) * roundInc,
            toSets: Math.max(1, list[0].sets.length - 1),
          }
        : stalled
          ? { kind: 'hold' }
          : { kind: 'advance', addWeight: increment }

    lifts.push({
      movement,
      sessions: list.length,
      lastTopWeight: list[0].topWeight,
      lastTopReps: list[0].topReps,
      bestE1rm,
      lastE1rm: list[0].e1rm,
      velocity: window.length >= 2 ? window[0].e1rm - window[window.length - 1].e1rm : 0,
      spanDays:
        window.length >= 2 ? Math.round(daysBetween(window[0].date, window[window.length - 1].date)) : 0,
      stallLen,
      stalled,
      fatigue: f,
      nextMove,
    })
  }

  const nowMs = now.getTime()
  const daysSinceLast = battles.length
    ? Math.floor((nowMs - new Date(battles[0].date).getTime()) / DAY)
    : 0
  const battlesLast14 = battles.filter((b) => nowMs - new Date(b.date).getTime() <= 14 * DAY).length
  const battlesLast42 = battles.filter((b) => nowMs - new Date(b.date).getTime() <= 42 * DAY).length
  const paceBaseline = battlesLast42 / 6
  const paceRecent = battlesLast14 / 2
  const drifting =
    battles.length > 0 && (daysSinceLast >= 5 || (paceBaseline >= 1.5 && paceRecent < paceBaseline * 0.5))

  let weakest: CoachSignals['weakest']
  if (bodyweight > 0) {
    for (const [movement, pr] of Object.entries(prs)) {
      if (!(pr > 0)) continue
      const std = lookups.standardOf(movement)
      if (!std) continue
      const target = Math.round(bodyweight * std)
      const pct = Math.round((pr / target) * 100)
      if (!weakest || pct < weakest.pct) weakest = { movement, pr, target, pct }
    }
  }

  const deloads = lifts.filter((l) => l.nextMove.kind === 'deload')

  const focus =
    deloads[0] ??
    lifts.filter((l) => l.stalled).sort((a, b) => b.stallLen - a.stallLen)[0] ??
    (weakest && lifts.find((l) => l.movement === weakest!.movement)) ??
    lifts[0]

  return { lifts, weakest, deloads, adherence: { daysSinceLast, battlesLast14, battlesLast42, drifting }, focus }
}
