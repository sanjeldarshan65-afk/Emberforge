/* ================================================================
   THE HOARD — item catalog & lore.
   This module is the container's contents: every relic, trophy, title
   and cosmetic the game knows of. Nothing is GRANTED here — earning and
   dropping arrive next. Ownership lives in the store's `inventory` slice.
   ================================================================ */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'
export type ItemType = 'title' | 'trophy' | 'cosmetic' | 'relic'

/** the few items that truly buff carry a typed descriptor; the rest are null */
export type ItemEffect =
  | { kind: 'soulsMultiplier'; value: number } // +value% souls from a battle
  | { kind: 'xpBonus'; value: number } // +value% XP from a battle
  | { kind: 'fatigueRecovery'; value: number } // muscles recover value% faster

export type Item = {
  id: string
  name: string
  lore: string
  rarity: Rarity
  type: ItemType
  effect: ItemEffect | null
  unlockHint: string
  stackable?: boolean // unique by default; stackable items increment quantity instead of duplicating
}

/** brightest first — for grouping/sorting the grid */
export const RARITY_ORDER: Rarity[] = ['legendary', 'rare', 'uncommon', 'common']

export const ITEMS: Item[] = [
  {
    id: 'unkindled-ash',
    name: 'Unkindled Ash',
    rarity: 'common',
    type: 'trophy',
    effect: null,
    lore: 'A pinch of thine own cold ash, kept close. Every legend begins as this — nameless, unlit, waiting for the first spark.',
    unlockHint: 'Borne from the first kindling.',
  },
  {
    id: 'tarnished-coin',
    name: 'Tarnished Souls-Coin',
    rarity: 'common',
    type: 'cosmetic',
    effect: null,
    lore: 'A coin worn smooth by dead hands. It buys nothing, yet every hollow carries one still — a habit older than memory.',
    unlockHint: 'Borne from the first kindling.',
  },
  {
    id: 'hollow-eye',
    name: "The Hollow's Eye",
    rarity: 'common',
    type: 'cosmetic',
    effect: null,
    lore: 'A dull, unblinking eye of grey glass. It opens only for those who let the fire fade — a quiet mark of the days gone dark.',
    unlockHint: 'Fall once to the Curse of Hollowing.',
  },
  {
    id: 'iron-band',
    name: 'Band of the Iron Vow',
    rarity: 'uncommon',
    type: 'relic',
    effect: { kind: 'soulsMultiplier', value: 5 },
    lore: 'Forged from a bar that never bent. Those who wear it swear the iron gives its souls a little more freely.',
    unlockHint: 'Reach Level 3.',
  },
  {
    id: 'estus-shard',
    name: 'Shard of the Estus',
    rarity: 'uncommon',
    type: 'relic',
    effect: { kind: 'fatigueRecovery', value: 10 },
    lore: 'A sliver of the flask-glass, forever warm. In its glow the body knits a touch quicker than it ought.',
    unlockHint: 'Reach Level 7.',
  },
  {
    id: 'taper-sigil',
    name: 'Sigil of the Golden Taper',
    rarity: 'uncommon',
    type: 'cosmetic',
    effect: null,
    lore: 'A brand in the shape of the V — the silhouette every ashen one chases through the long dark of training.',
    unlockHint: 'Reach a shoulder-to-waist ratio of 1.40.',
  },
  {
    id: 'hundred-gauntlet',
    name: 'Gauntlet of a Hundred Clashes',
    rarity: 'rare',
    type: 'trophy',
    effect: null,
    lore: 'Leather cracked, knuckles scarred white. It has met the iron a hundred times and yielded not once.',
    unlockHint: 'Drive a lift to an estimated 1RM of 225.',
  },
  {
    id: 'ember-heart',
    name: 'Ember-Heart Coal',
    rarity: 'rare',
    type: 'relic',
    effect: { kind: 'fatigueRecovery', value: 15 },
    lore: 'A coal that refuses to die. Pressed to the chest, worn muscle cools and mends before its hour.',
    unlockHint: 'Drive a lift to an estimated 1RM of 315.',
  },
  {
    id: 'ashen-crown',
    name: 'Crown of the Ashen Lord',
    rarity: 'rare',
    type: 'title',
    effect: null,
    lore: 'No jewels — only soot and resolve. Worn by those who climbed high enough that lesser hollows learned to fear them.',
    unlockHint: 'Reach Level 10.',
  },
  {
    id: 'radiant-medal',
    name: 'Medal of Radiant Toil',
    rarity: 'rare',
    type: 'cosmetic',
    effect: null,
    lore: 'It catches a light that is not in the room. Praise the discipline that earned it, and the days it cost.',
    unlockHint: 'Hold a 30-day streak.',
  },
  {
    id: 'lord-vessel',
    name: 'The Lord Vessel',
    rarity: 'legendary',
    type: 'relic',
    effect: { kind: 'xpBonus', value: 10 },
    lore: 'An empty vessel that fills as thou dost. What it holds, none can say — yet thou growest ever faster for the bearing of it.',
    unlockHint: 'Reach Level 25.',
  },
  {
    id: 'grand-flame',
    name: 'Flame of the Grand Order',
    rarity: 'legendary',
    type: 'title',
    effect: null,
    lore: 'The fire made manifest, cupped in a mortal hand. Only they who forge the perfect V may speak its name as their own.',
    unlockHint: 'Achieve the Golden Taper (1.618).',
  },
  {
    id: 'sentinels-plate',
    name: 'Plate of the Iron Sentinel',
    rarity: 'rare',
    type: 'trophy',
    effect: null,
    lore: 'Torn from the Sentinel where it fell. Two plates a side, and it guards the gate no longer.',
    unlockHint: 'Fell the Iron Sentinel in a Boss Encounter.',
  },
  {
    id: 'bulwark-seal',
    name: 'Seal of the Bulwark',
    rarity: 'rare',
    type: 'trophy',
    effect: null,
    lore: 'The Bulwark pressed back against all who lay beneath it. Thou pressed harder.',
    unlockHint: 'Fell the Bulwark in a Boss Encounter.',
  },
  {
    id: 'wardens-chain',
    name: 'Chain of the Grave Warden',
    rarity: 'legendary',
    type: 'trophy',
    effect: null,
    lore: 'Three plates dragged from the earth, and the Warden with them. The graves keep their own now.',
    unlockHint: 'Fell the Grave Warden in a Boss Encounter.',
  },
  {
    id: 'colossus-heart',
    name: 'Heart of the Colossus',
    rarity: 'legendary',
    type: 'trophy',
    effect: null,
    lore: 'Four plates. The Colossus of Iron does not kneel — yet it was raised, and so it fell.',
    unlockHint: 'Fell the Colossus of Iron in a Boss Encounter.',
  },
]

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]))
export const getItem = (id: string): Item | undefined => BY_ID.get(id)

/** group the catalog (or any subset) by rarity, brightest tier first */
export const itemsByRarity = (items: Item[] = ITEMS): Record<Rarity, Item[]> => {
  const out: Record<Rarity, Item[]> = { legendary: [], rare: [], uncommon: [], common: [] }
  for (const it of items) out[it.rarity].push(it)
  return out
}

/** the catalog items the player owns, given the set of owned ids */
export const ownedItems = (ownedIds: Set<string>): Item[] => ITEMS.filter((i) => ownedIds.has(i.id))

/** human-readable line for the detail panel */
export const effectText = (effect: ItemEffect | null): string => {
  if (!effect) return 'Purely a trophy of thy deeds.'
  switch (effect.kind) {
    case 'soulsMultiplier':
      return `+${effect.value}% souls from every battle.`
    case 'xpBonus':
      return `+${effect.value}% experience from every battle.`
    case 'fatigueRecovery':
      return `Thy muscles recover ${effect.value}% faster.`
  }
}

/* ================================================================
   DROP TABLES — where loot enters the Hoard. Data-driven; the store
   reads these in endBattle. Quest drops arrive later — the clean hook
   for granting any item by id is the store's grantItem() action.
   ================================================================ */

/** level reached → item granted (once) */
export const LEVEL_DROPS: Record<number, string> = {
  3: 'iron-band',
  7: 'estus-shard',
  10: 'ashen-crown',
  25: 'lord-vessel',
}

/** first time any lift's estimated 1RM crosses the threshold → item granted (once) */
export const PR_MILESTONES: { e1rm: number; itemId: string }[] = [
  { e1rm: 225, itemId: 'hundred-gauntlet' },
  { e1rm: 315, itemId: 'ember-heart' },
]

/** sum the mechanical perks of the owned items, by kind (percentages) */
export const sumEffects = (
  ownedIds: Set<string>
): { soulsPct: number; xpPct: number; recoveryPct: number } => {
  let soulsPct = 0
  let xpPct = 0
  let recoveryPct = 0
  for (const id of ownedIds) {
    const e = getItem(id)?.effect
    if (!e) continue
    if (e.kind === 'soulsMultiplier') soulsPct += e.value
    else if (e.kind === 'xpBonus') xpPct += e.value
    else if (e.kind === 'fatigueRecovery') recoveryPct += e.value
  }
  return { soulsPct, xpPct, recoveryPct }
}

/* ================================================================
   THE MERCHANT — a soul-sink. A curated subset of the catalog, sold
   at prices that scale with rarity. Owned unique relics sell out.
   ================================================================ */

export const RARITY_PRICE: Record<Rarity, number> = {
  common: 2500,
  uncommon: 6000,
  rare: 16000,
  legendary: 40000,
}

/** the merchant's stock — catalog ids he is willing to part with */
export const SHOP_STOCK: string[] = [
  'hollow-eye',
  'taper-sigil',
  'iron-band',
  'radiant-medal',
  'ember-heart',
  'grand-flame',
]

export const priceOf = (id: string): number => {
  const it = getItem(id)
  return it ? RARITY_PRICE[it.rarity] : 0
}
