import type { Movement } from './store'

/* ================================================================
   COVENANTS — trackable goals. Progress is DERIVED from real game
   state (level, PRs, battle log, macros, taper), never checked off
   by hand. Completing one grants souls and, sometimes, a relic
   (through the store's grantItem loot path). Persisted state is only
   which covenants have been claimed — progress recomputes live.
   ================================================================ */

export type QuestObjective =
  | { kind: 'reachLevel'; target: number }
  | { kind: 'prLift'; lift: Movement; target: number } // top-set weight PR on a lift
  | { kind: 'logBattles'; target: number }
  | { kind: 'streak'; target: number } // consecutive workout days
  | { kind: 'macroDays'; target: number } // days the calorie covenant was met
  | { kind: 'goldenTaper'; target: number } // shoulder : waist ratio

export type QuestCategory = 'Training' | 'Nutrition' | 'Consistency' | 'Ascension'

export type Quest = {
  id: string
  name: string
  lore: string
  category: QuestCategory
  objective: QuestObjective
  unit: string // suffix shown after the progress numbers ('battles', 'lb', 'days', '')
  souls: number
  itemReward?: string // catalog item id, granted on claim
}

/** everything the derivations need, gathered from the store once */
export type QuestContext = {
  level: number
  battleCount: number
  streak: number
  prs: Record<string, number>
  macroDays: number
  taperRatio: number
}

export const questTarget = (o: QuestObjective): number => o.target

/** current progress toward a covenant, read purely from live state */
export function questProgress(o: QuestObjective, ctx: QuestContext): number {
  switch (o.kind) {
    case 'reachLevel':
      return ctx.level
    case 'prLift':
      return ctx.prs[o.lift] ?? 0
    case 'logBattles':
      return ctx.battleCount
    case 'streak':
      return ctx.streak
    case 'macroDays':
      return ctx.macroDays
    case 'goldenTaper':
      return ctx.taperRatio
  }
}

export const isComplete = (o: QuestObjective, ctx: QuestContext): boolean =>
  questProgress(o, ctx) >= o.target

export type QuestRow = {
  q: Quest
  progress: number
  target: number
  complete: boolean
  claimed: boolean
  pct: number
}

/** every quest, with live progress, sorted claimable-first then most-progressed —
    the single ordering used by both the Covenants list and the Trials hero card */
export function questRows(ctx: QuestContext, claimedQuests: string[]): QuestRow[] {
  const rank = (complete: boolean, claimed: boolean) => (claimed ? 2 : complete ? 0 : 1)
  return QUESTS.map((q) => {
    const progress = questProgress(q.objective, ctx)
    const target = questTarget(q.objective)
    const complete = progress >= target
    const claimed = claimedQuests.includes(q.id)
    const pct = Math.max(0, Math.min(100, (progress / target) * 100))
    return { q, progress, target, complete, claimed, pct }
  }).sort((a, b) => {
    const dr = rank(a.complete, a.claimed) - rank(b.complete, b.claimed)
    return dr !== 0 ? dr : b.pct - a.pct
  })
}

/** number of distinct days whose logged calories met (or beat) the goal */
export const macroDaysMet = (
  rations: { date: string; calories: number }[],
  goalCalories: number
): number => {
  if (goalCalories <= 0) return 0
  const byDay = new Map<string, number>()
  for (const r of rations) byDay.set(r.date, (byDay.get(r.date) ?? 0) + r.calories)
  let n = 0
  for (const cal of byDay.values()) if (cal >= goalCalories) n++
  return n
}

export const QUESTS: Quest[] = [
  {
    id: 'first-blood',
    name: 'First Blood',
    lore: 'The iron does not know thee yet. Meet it five times, and it shall learn thy name.',
    category: 'Training',
    objective: { kind: 'logBattles', target: 5 },
    unit: 'battles',
    souls: 300,
    itemReward: 'radiant-medal',
  },
  {
    id: 'iron-hundred',
    name: 'Chronicle of the Iron',
    lore: 'Five-and-twenty clashes, each inscribed in the ledger. A record no hollow can erase.',
    category: 'Training',
    objective: { kind: 'logBattles', target: 25 },
    unit: 'battles',
    souls: 900,
    itemReward: 'hundred-gauntlet',
  },
  {
    id: 'two-plate-bench',
    name: 'The Two-Plate Vow',
    lore: 'Lay two plates upon each end and drive them from thy chest. The bench yields to few.',
    category: 'Training',
    objective: { kind: 'prLift', lift: 'Bench Press', target: 225 },
    unit: 'lb',
    souls: 600,
    itemReward: 'iron-band',
  },
  {
    id: 'the-ascent',
    name: 'The Long Ascent',
    lore: 'Climb to the tenth rung of legend. From there the ashen ones below look very small.',
    category: 'Training',
    objective: { kind: 'reachLevel', target: 10 },
    unit: '',
    souls: 1200,
    itemReward: 'ashen-crown',
  },
  {
    id: 'unbroken-vow',
    name: 'The Unbroken Vow',
    lore: 'Seven days, and the fire never once left to gutter. Consistency is the truest strength.',
    category: 'Consistency',
    objective: { kind: 'streak', target: 7 },
    unit: 'days',
    souls: 800,
    itemReward: 'estus-shard',
  },
  {
    id: 'disciplined-flesh',
    name: 'Covenant of the Flesh',
    lore: 'Feed the vessel as the covenant demands, seven days over. The body is built at the table too.',
    category: 'Nutrition',
    objective: { kind: 'macroDays', target: 7 },
    unit: 'days',
    souls: 700,
    itemReward: 'taper-sigil',
  },
  {
    id: 'the-golden-taper',
    name: 'The Golden Taper',
    lore: 'Broaden the shoulders, carve the waist, until the ratio of legend — 1.618 — is thine. The silhouette all ashen ones chase.',
    category: 'Ascension',
    objective: { kind: 'goldenTaper', target: 1.618 },
    unit: '',
    souls: 2000,
    itemReward: 'grand-flame',
  },
]
