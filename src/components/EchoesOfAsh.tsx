import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useGame, statusEffects, localDayKey } from '../state/store'
import EmptyWidget, { navigateTab } from './EmptyWidget'

/* ================================================================
   ECHOES OF ASH — a rolling 12-week heatmap of daily battle.
   Each rune is a day; the brighter it burns, the greater the
   tonnage moved. Cold iron marks days of rest. When the vessel is
   Hollowed, the embers cool to a spectral blue.
   ================================================================ */

const WEEKS = 12
const DAY_MS = 86_400_000

/* intensity thresholds by day tonnage (lb moved) — stated plainly */
const LEVELS = [3000, 6000, 10000] // >0→1, ≥3k→2, ≥6k→3, ≥10k→4
const ALPHA = [0, 0.28, 0.5, 0.74, 0.96]

const levelFor = (tonnage: number) =>
  tonnage <= 0 ? 0 : tonnage < LEVELS[0] ? 1 : tonnage < LEVELS[1] ? 2 : tonnage < LEVELS[2] ? 3 : 4

const prettyDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

type DayCell = { key: string; future: boolean }

export default function EchoesOfAsh() {
  const battles = useGame((s) => s.battles)
  const manualHollow = useGame((s) => s.settings.hollowed)
  const hollowed = manualHollow || statusEffects(battles).cursed

  /* day → { tonnage, count, movements } */
  const byDay = useMemo(() => {
    const map = new Map<string, { tonnage: number; count: number; movements: Set<string> }>()
    for (const b of battles) {
      const key = localDayKey(b.date)
      const cur = map.get(key) ?? { tonnage: 0, count: 0, movements: new Set<string>() }
      cur.tonnage += b.volume
      cur.count += 1
      cur.movements.add(b.movement)
      map.set(key, cur)
    }
    return map
  }, [battles])

  /* weekday-aligned grid: full weeks (Sun–Sat), the last column holds today */
  const cells = useMemo<DayCell[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const gridEnd = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS) // Saturday this week
    const start = gridEnd.getTime() - (WEEKS * 7 - 1) * DAY_MS
    const out: DayCell[] = []
    for (let i = 0; i < WEEKS * 7; i++) {
      const dt = new Date(start + i * DAY_MS)
      out.push({ key: localDayKey(dt.toISOString()), future: dt.getTime() > today.getTime() })
    }
    return out
  }, [])

  const [sel, setSel] = useState<string | null>(null)

  const base = hollowed ? '109,168,207' : '255,117,24'
  const selData = sel ? byDay.get(sel) : undefined

  if (byDay.size === 0) {
    return (
      <EmptyWidget
        title="The Ash Lies Cold"
        body="Not a single ember burns yet. Fight thy first battle, and the weeks shall fill with ash and fire."
        cta="Fight thy first battle"
        onCta={() => navigateTab('combat')}
      />
    )
  }

  return (
    <div className="panel panel-ornate p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-display text-[0.65rem] tracking-[0.25em] uppercase text-souls-dim">
          {WEEKS} weeks of ash &amp; ember
        </span>
        <span className="font-ui text-[0.65rem] text-faded">tap a rune</span>
      </div>

      {/* the grid — 7 rows (Sun→Sat), one column per week */}
      <div className="grid grid-rows-7 grid-flow-col gap-[3px] w-max">
        {cells.map((c, i) => {
          if (c.future) return <span key={c.key} className="w-3 h-3" aria-hidden />
          const data = byDay.get(c.key)
          const lvl = levelFor(data?.tonnage ?? 0)
          const active = lvl > 0
          const isSel = sel === c.key
          return (
            <motion.button
              key={c.key}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.002, 0.4), duration: 0.25 }}
              onClick={() => setSel(isSel ? null : c.key)}
              aria-label={`${prettyDate(c.key)}: ${data ? `${data.tonnage.toLocaleString()} lb` : 'rest'}`}
              className="w-3 h-3 border"
              style={{
                background: active ? `rgba(${base},${ALPHA[lvl]})` : 'var(--color-iron)',
                borderColor: isSel ? 'var(--color-souls)' : 'transparent',
                boxShadow: active ? `0 0 6px rgba(${base},${ALPHA[lvl] * 0.5})` : 'none',
              }}
            />
          )
        })}
      </div>

      {/* legend */}
      <div className="flex items-center gap-1.5 mt-3 font-ui text-[0.6rem] text-faded">
        <span>less</span>
        {ALPHA.map((a, i) => (
          <span
            key={i}
            className="w-3 h-3 border border-transparent"
            style={{ background: a === 0 ? 'var(--color-iron)' : `rgba(${base},${a})` }}
            aria-hidden
          />
        ))}
        <span>more</span>
      </div>

      {/* reading */}
      <div className="mt-3 min-h-10 border-t border-ash pt-2">
        {sel ? (
          <p className="font-ui text-xs text-bone-dim">
            <span className="text-souls">{prettyDate(sel)}</span>
            {selData ? (
              <>
                {' '}&middot; {[...selData.movements].join(', ')} &middot;{' '}
                <span className="text-souls">{selData.tonnage.toLocaleString()} lb</span> moved
                {selData.count > 1 && ` · ${selData.count} battles`}
              </>
            ) : (
              <> &middot; <span className="italic text-faded">a day of rest; the forge lay cold</span></>
            )}
          </p>
        ) : (
          <p className="font-ui text-xs text-faded italic">
            {byDay.size < 4
              ? 'Only a few embers yet burn. Return day by day, and the ash will spread across the weeks.'
              : 'Each rune a day beneath the iron. Tap one to recall the battle.'}
          </p>
        )}
      </div>
    </div>
  )
}
