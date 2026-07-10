import type { ItemEffect } from './items'

/* ================================================================
   THE CONSTELLATION — a souls-spent skill tree. Three branches
   (Ember/souls, Mind/xp, Flesh/recovery), each a chain of three
   nodes gated by prerequisites. Every perk is REAL: its value is
   summed with owned relic effects and applied in the same paths —
   souls & XP in endBattle, recovery in the muscle-fatigue window.
   ================================================================ */

export type ConstellationNode = {
  id: string
  name: string
  lore: string
  branch: 'Ember' | 'Mind' | 'Flesh'
  tier: 1 | 2 | 3
  cost: number // souls to unlock
  prereqs: string[] // node ids that must be unlocked first
  perk: ItemEffect // reuses the relic effect kinds, so it flows through sumEffects-style aggregation
}

export const CONSTELLATION: ConstellationNode[] = [
  // ---- Ember branch: souls ----
  { id: 'kindled-spirit', name: 'Kindled Spirit', branch: 'Ember', tier: 1, cost: 5000, prereqs: [],
    perk: { kind: 'soulsMultiplier', value: 5 },
    lore: 'The first true spark. Souls cling a little more readily to a fire that will not die.' },
  { id: 'soul-glutton', name: 'Soul Glutton', branch: 'Ember', tier: 2, cost: 20000, prereqs: ['kindled-spirit'],
    perk: { kind: 'soulsMultiplier', value: 10 },
    lore: 'Hunger becomes a virtue. Every battle feeds the flame more richly than the last.' },
  { id: 'lord-of-souls', name: 'Lord of Souls', branch: 'Ember', tier: 3, cost: 55000, prereqs: ['soul-glutton'],
    perk: { kind: 'soulsMultiplier', value: 15 },
    lore: 'The souls of the fallen iron flow to thee as tribute to a crowned thing.' },

  // ---- Mind branch: xp ----
  { id: 'keen-mind', name: 'Keen Mind', branch: 'Mind', tier: 1, cost: 5000, prereqs: [],
    perk: { kind: 'xpBonus', value: 5 },
    lore: 'Thou learnest from each clash — the angle, the brace, the breath.' },
  { id: 'scholar-of-ash', name: 'Scholar of Ash', branch: 'Mind', tier: 2, cost: 20000, prereqs: ['keen-mind'],
    perk: { kind: 'xpBonus', value: 10 },
    lore: 'The ashes are a library. Read them, and grow the swifter for it.' },
  { id: 'grand-strategist', name: 'Grand Strategist', branch: 'Mind', tier: 3, cost: 55000, prereqs: ['scholar-of-ash'],
    perk: { kind: 'xpBonus', value: 15 },
    lore: 'Every campaign against the iron is planned three moves ahead. Experience compounds.' },

  // ---- Flesh branch: recovery ----
  { id: 'swift-mending', name: 'Swift Mending', branch: 'Flesh', tier: 1, cost: 5000, prereqs: [],
    perk: { kind: 'fatigueRecovery', value: 10 },
    lore: 'The vessel knits itself a touch faster in the dark between battles.' },
  { id: 'iron-constitution', name: 'Iron Constitution', branch: 'Flesh', tier: 2, cost: 20000, prereqs: ['swift-mending'],
    perk: { kind: 'fatigueRecovery', value: 15 },
    lore: 'Forged sturdier with each ordeal. The embers of fatigue cool the quicker.' },
  { id: 'undying', name: 'The Undying', branch: 'Flesh', tier: 3, cost: 55000, prereqs: ['iron-constitution'],
    perk: { kind: 'fatigueRecovery', value: 20 },
    lore: 'Break the body, and it returns before its hour. Rest becomes a formality.' },
]

const BY_ID = new Map(CONSTELLATION.map((n) => [n.id, n]))
export const getNode = (id: string) => BY_ID.get(id)

/** a node is available once every prerequisite has been unlocked */
export const nodeAvailable = (n: ConstellationNode, unlocked: Set<string>): boolean =>
  n.prereqs.every((p) => unlocked.has(p))

/** sum the perks of the unlocked nodes, by kind — mirrors items' sumEffects */
export const constellationEffects = (
  unlocked: Set<string>
): { soulsPct: number; xpPct: number; recoveryPct: number } => {
  let soulsPct = 0
  let xpPct = 0
  let recoveryPct = 0
  for (const id of unlocked) {
    const p = getNode(id)?.perk
    if (!p) continue
    if (p.kind === 'soulsMultiplier') soulsPct += p.value
    else if (p.kind === 'xpBonus') xpPct += p.value
    else if (p.kind === 'fatigueRecovery') recoveryPct += p.value
  }
  return { soulsPct, xpPct, recoveryPct }
}
