import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGame, levelInfo, todayKey } from '../state/store'
import { SIGILS, maxStreak } from '../state/sigils'
import type { SigilCtx } from '../state/sigils'
import { useToast } from '../ui/Toast'

/* ================================================================
   SIGILS OF THE FORGE — the trophy vault + unlock watcher
   ================================================================ */

function useSigilCtx(): SigilCtx {
  const battles = useGame((s) => s.battles)
  const prs = useGame((s) => s.prs)
  const souls = useGame((s) => s.souls)
  const xp = useGame((s) => s.xp)
  const lifetimeVolume = useGame((s) => s.lifetimeVolume)
  const lifetimeSets = useGame((s) => s.lifetimeSets)
  const routines = useGame((s) => s.routines)
  const rations = useGame((s) => s.rations)
  const macroGoals = useGame((s) => s.macroGoals)

  return useMemo(() => {
    const today = todayKey()
    const proteinToday = rations
      .filter((r) => r.date === today)
      .reduce((t, r) => t + r.protein, 0)
    return {
      battleCount: battles.length,
      prs,
      prCount: Object.values(prs).filter((w) => w > 0).length,
      souls,
      level: levelInfo(xp).level,
      maxStreak: maxStreak(battles),
      lifetimeVolume,
      lifetimeSets,
      routineCount: routines.length,
      proteinMetToday: macroGoals.protein > 0 && proteinToday >= macroGoals.protein,
    }
  }, [battles, prs, souls, xp, lifetimeVolume, lifetimeSets, routines, rations, macroGoals])
}

/** renders nothing; announces freshly earned sigils exactly once */
export function SigilWatcher() {
  const ctx = useSigilCtx()
  const seen = useGame((s) => s.sigilsSeen)
  const markSigilsSeen = useGame((s) => s.markSigilsSeen)
  const toast = useToast()

  const unlockedKey = SIGILS.filter((s) => s.check(ctx))
    .map((s) => s.id)
    .join(',')

  useEffect(() => {
    const unlocked = unlockedKey ? unlockedKey.split(',') : []
    const fresh = unlocked.filter((id) => !seen.includes(id))
    if (fresh.length === 0) return
    for (const id of fresh) {
      const sig = SIGILS.find((s) => s.id === id)
      if (sig) toast(`Sigil earned — ${sig.name}`, 'ember')
    }
    markSigilsSeen(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedKey])

  return null
}

export default function SigilVault() {
  const ctx = useSigilCtx()
  const earned = SIGILS.filter((s) => s.check(ctx)).length

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-ui text-xs text-faded">
          {earned} of {SIGILS.length} earned
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {SIGILS.map((s) => {
          const unlocked = s.check(ctx)
          return (
            <motion.div
              key={s.id}
              whileTap={{ scale: 0.96 }}
              className={`panel p-3 text-center min-h-24 flex flex-col items-center justify-center ${
                unlocked ? 'border-souls-dim/70' : 'opacity-45'
              }`}
            >
              <span
                className={`text-2xl leading-none mb-1.5 ${
                  unlocked
                    ? 'text-souls drop-shadow-[0_0_8px_rgba(230,195,92,0.6)]'
                    : 'text-stone'
                }`}
                aria-hidden
              >
                {s.glyph}
              </span>
              <div
                className={`font-display text-[0.55rem] tracking-[0.12em] uppercase leading-tight ${
                  unlocked ? 'text-souls' : 'text-bone-dim'
                }`}
              >
                {s.name}
              </div>
              <div className="font-ui text-[0.55rem] text-faded mt-1 leading-tight">{s.desc}</div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
