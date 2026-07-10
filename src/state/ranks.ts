/* ================================================================
   RANKS — a named ladder laid over the numeric level. Purely a
   presentational tier: no new mechanics, no persisted state. Every
   rank is derived live from `levelInfo(xp).level`, same as the XP bar.
   ================================================================ */

export type Rank = {
  key: string
  name: string
  minLevel: number
  glyph: string
  color: string // CSS custom-property reference, matches the theme palette
  hex: string // raw hex twin of `color` — for share-card capture, where var() is unsafe
}

export const RANKS: Rank[] = [
  { key: 'unkindled', name: 'Unkindled', minLevel: 1, glyph: '◇', color: 'var(--color-faded)', hex: '#6e6553' },
  { key: 'ashen', name: 'Ashen', minLevel: 5, glyph: '◆', color: 'var(--color-bone-dim)', hex: '#a89e86' },
  { key: 'ember-touched', name: 'Ember-Touched', minLevel: 10, glyph: '◈', color: 'var(--color-ember)', hex: '#ff7518' },
  { key: 'cinderborn', name: 'Cinderborn', minLevel: 15, glyph: '❖', color: 'var(--color-ember-bright)', hex: '#ffa04d' },
  { key: 'forgeborn', name: 'Forgeborn', minLevel: 20, glyph: '✦', color: 'var(--color-souls-dim)', hex: '#9c7f35' },
  { key: 'emberlord', name: 'Emberlord', minLevel: 30, glyph: '✧', color: 'var(--color-souls)', hex: '#e6c35c' },
  { key: 'titan-of-the-forge', name: 'Titan of the Forge', minLevel: 40, glyph: '☄', color: 'var(--color-estus)', hex: '#ffb347' },
  { key: 'undying-flame', name: 'Undying Flame', minLevel: 60, glyph: '☀', color: 'var(--color-blood-bright)', hex: '#dc2626' },
]

/** the highest rank whose threshold the given level has reached */
export function rankForLevel(level: number): Rank {
  let cur = RANKS[0]
  for (const r of RANKS) {
    if (level >= r.minLevel) cur = r
    else break
  }
  return cur
}

/** the next rank up, or null if already at the ceiling */
export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null
}

/** 0..1 progress from the current rank's threshold to the next one's */
export function rankProgress(level: number): number {
  const cur = rankForLevel(level)
  const next = nextRank(level)
  if (!next) return 1
  return Math.min(1, Math.max(0, (level - cur.minLevel) / (next.minLevel - cur.minLevel)))
}
