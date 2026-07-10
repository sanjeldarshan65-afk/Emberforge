import type { Movement } from './store'

/* ================================================================
   BOSS ENCOUNTERS — milestone challenge lifts. Each unlocks at a
   level threshold and is felled by driving its lift to a target
   weight (read from thy PRs). Felling one grants bonus souls and a
   unique trophy — through the store's grantItem / defeatBoss path.
   ================================================================ */

export type Boss = {
  id: string
  name: string
  lore: string
  movement: Movement // the lift that fells it
  target: number // top-set weight (lb) required
  unlockLevel: number // hidden until this level
  souls: number // bonus souls on the fell
  trophy: string // catalog item id granted
}

export type BossState = 'locked' | 'available' | 'ready' | 'felled'

export const BOSSES: Boss[] = [
  {
    id: 'iron-sentinel',
    name: 'The Iron Sentinel',
    lore: 'It stands at the first gate, two plates a side, and lets no unproven hollow pass.',
    movement: 'Squat',
    target: 225,
    unlockLevel: 3,
    souls: 1000,
    trophy: 'sentinels-plate',
  },
  {
    id: 'the-bulwark',
    name: 'The Bulwark',
    lore: 'A wall of a foe that presses back against all who lie beneath it. Press harder.',
    movement: 'Bench Press',
    target: 225,
    unlockLevel: 5,
    souls: 1200,
    trophy: 'bulwark-seal',
  },
  {
    id: 'grave-warden',
    name: 'The Grave Warden',
    lore: 'Three plates chained to the earth, and the Warden chained to them. Tear both free.',
    movement: 'Deadlift',
    target: 315,
    unlockLevel: 8,
    souls: 1800,
    trophy: 'wardens-chain',
  },
  {
    id: 'the-colossus',
    name: 'The Colossus of Iron',
    lore: 'Four plates. It has never knelt. It need only be raised — and in the raising, it falls.',
    movement: 'Deadlift',
    target: 405,
    unlockLevel: 15,
    souls: 3000,
    trophy: 'colossus-heart',
  },
]

export type BossContext = { level: number; prs: Record<string, number> }

export const bossUnlocked = (b: Boss, ctx: BossContext): boolean => ctx.level >= b.unlockLevel

/** the challenge is met once thy PR on the lift reaches the target */
export const bossChallengeMet = (b: Boss, prs: Record<string, number>): boolean =>
  (prs[b.movement] ?? 0) >= b.target

export const bossState = (b: Boss, ctx: BossContext, defeated: Set<string>): BossState => {
  if (defeated.has(b.id)) return 'felled'
  if (!bossUnlocked(b, ctx)) return 'locked'
  return bossChallengeMet(b, ctx.prs) ? 'ready' : 'available'
}
