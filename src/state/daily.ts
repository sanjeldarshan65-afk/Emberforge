import type { Battle, Ration, Macros } from './store'
import { localDayKey } from './store'

/* ================================================================
   THE DAILY EMBER — one small trial per day, drawn deterministically
   from a fixed pool so every device shows the same ember on the same
   date. Progress is derived live from today's slice of real state;
   the only persisted piece is which day-keys have been claimed.
   ================================================================ */

export type DailyKind = 'battle' | 'sets' | 'volume' | 'protein' | 'weighIn'

export type DailyEmber = {
  kind: DailyKind
  name: string
  charge: string // the day's instruction, in the forge voice
  target: number
  unit: string
  souls: number
}

export const DAILY_POOL: DailyEmber[] = [
  {
    kind: 'battle',
    name: 'First Clash',
    charge: 'Meet the iron once before the day burns out.',
    target: 1,
    unit: 'battle',
    souls: 150,
  },
  {
    kind: 'sets',
    name: 'Nine Blows',
    charge: 'Strike nine sets before the embers cool.',
    target: 9,
    unit: 'sets',
    souls: 250,
  },
  {
    kind: 'volume',
    name: 'The Day’s Tonnage',
    charge: 'Move five thousand pounds ere nightfall.',
    target: 5000,
    unit: 'lb',
    souls: 250,
  },
  {
    kind: 'protein',
    name: 'Feed the Vessel',
    charge: 'Meet thy protein covenant before the table is cleared.',
    target: 1, // measured as goal met (progress is g, target replaced at runtime)
    unit: 'g',
    souls: 200,
  },
  {
    kind: 'weighIn',
    name: 'Face the Scale',
    charge: 'Record thy weight. The ledger fears no truth.',
    target: 1,
    unit: 'weigh-in',
    souls: 120,
  },
  {
    kind: 'sets',
    name: 'Twelve Labors',
    charge: 'Twelve sets, no matter the lift. Endurance is its own rite.',
    target: 12,
    unit: 'sets',
    souls: 300,
  },
  {
    kind: 'volume',
    name: 'The Heavier Path',
    charge: 'Eight thousand pounds moved before the fire sleeps.',
    target: 8000,
    unit: 'lb',
    souls: 350,
  },
] as const

/** deterministic pick for a YYYY-MM-DD key — same ember on every device */
export function dailyForDay(dayKey: string): DailyEmber {
  let h = 0
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0
  return DAILY_POOL[h % DAILY_POOL.length]
}

export type DailyContext = {
  battles: Battle[]
  rations: Ration[]
  weighIns: { date: string; weight: number }[]
  macroGoals: Macros
  dayKey: string
}

/** { progress, target } for the day's ember, from today's slice of state */
export function dailyProgress(ember: DailyEmber, ctx: DailyContext): { progress: number; target: number } {
  const todays = ctx.battles.filter((b) => localDayKey(b.date) === ctx.dayKey)
  switch (ember.kind) {
    case 'battle':
      return { progress: todays.length, target: ember.target }
    case 'sets':
      return { progress: todays.reduce((n, b) => n + b.sets.length, 0), target: ember.target }
    case 'volume':
      return { progress: todays.reduce((n, b) => n + b.volume, 0), target: ember.target }
    case 'protein': {
      const eaten = ctx.rations.filter((r) => r.date === ctx.dayKey).reduce((n, r) => n + r.protein, 0)
      return { progress: Math.round(eaten), target: Math.max(1, ctx.macroGoals.protein) }
    }
    case 'weighIn':
      return { progress: ctx.weighIns.some((w) => w.date === ctx.dayKey) ? 1 : 0, target: 1 }
  }
}
