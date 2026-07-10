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
}

export const RANKS: Rank[] = [
  { key: 'unkindled', name: 'Unkindled', minLevel: 1, glyph: '◇', color: 'var(--color-faded)' },
  { key: 'ashen', name: 'Ashen', minLevel: 5, glyph: '◆', color: 'var(--color-bone-dim)' },
  { key: 'ember-touched', name: 'Ember-Touched', minLevel: 10, glyph: '◈', color: 'var(--color-ember)' },
  { key: 'cinderborn', name: 'Cinderborn', minLevel: 15, glyph: '❖', color: 'var(--color-ember-bright)' },
  { key: 'forgeborn', name: 'Forgeborn', minLevel: 20, glyph: '✦', color: 'var(--color-souls-dim)' },
  { key: 'emberlord', name: 'Emberlord', minLevel: 30, glyph: '✧', color: 'var(--color-souls)' },
  { key: 'titan-of-the-forge', name: 'Titan of the Forge', minLevel: 40, glyph: '☄', color: 'var(--color-estus)' },
  { key: 'undying-flame', name: 'Undying Flame', minLevel: 60, glyph: '☀', color: 'var(--color-blood-bright)' },
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
