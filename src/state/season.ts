import type { Battle } from './store'

/* ================================================================
   THE RITE OF THE SEASON — a time-boxed trial that resets every
   calendar quarter. No backend exists for this app by design (saves
   are local-only — see the title screen's promise), so this tracks
   the ASHEN ONE'S OWN contribution across the season, not a
   fabricated global tally. The "countless others" framing stays in
   the lore, honestly, as flavor rather than invented data.
   ================================================================ */

export type Season = {
  id: string // e.g. "2026-Q3" — also the claim key
  name: string
  tagline: string
  start: Date
  end: Date
  target: number // reps
  souls: number
}

const SEASON_NAMES: { name: string; tagline: string }[] = [
  { name: 'Rite of the Deep Cold', tagline: 'The forge burns hottest when the world is coldest.' },
  { name: 'Rite of Kindling', tagline: 'New growth, new iron. Begin again.' },
  { name: 'Rite of the Long Light', tagline: 'The days stretch. So does thy ledger.' },
  { name: 'Rite of the Falling Ash', tagline: 'What is shed now makes room for what is forged next.' },
]

/** the current calendar-quarter season, derived purely from the clock */
export function currentSeason(now: Date = new Date()): Season {
  const year = now.getFullYear()
  const q = Math.floor(now.getMonth() / 3) // 0..3
  const start = new Date(year, q * 3, 1)
  const end = new Date(year, q * 3 + 3, 1)
  const { name, tagline } = SEASON_NAMES[q]
  return {
    id: `${year}-Q${q + 1}`,
    name,
    tagline,
    start,
    end,
    target: 3000, // reps across the quarter — ~230/week, well within a consistent lifter's reach
    souls: 2500,
  }
}

/** total reps logged within the season's window */
export function seasonReps(battles: Battle[], season: Season): number {
  let reps = 0
  for (const b of battles) {
    const d = new Date(b.date)
    if (d >= season.start && d < season.end) {
      for (const s of b.sets) reps += s.reps
    }
  }
  return reps
}

/** whole days remaining until the season turns over (never negative) */
export function daysLeft(season: Season, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((season.end.getTime() - now.getTime()) / 86_400_000))
}
