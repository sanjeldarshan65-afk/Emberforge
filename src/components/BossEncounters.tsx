import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, levelInfo, statusEffects } from '../state/store'
import { BOSSES, bossState } from '../state/bosses'
import type { Boss } from '../state/bosses'
import { getItem } from '../state/items'
import { useModalDismiss } from '../ui/useModalDismiss'

/* ================================================================
   BOSS ENCOUNTERS — milestone challenge lifts. Unlock with thy level,
   fell by driving the lift to its target weight, claim bonus souls
   and a unique trophy.
   ================================================================ */

const RANK = { ready: 0, available: 1, locked: 2, felled: 3 } as const

export default function BossEncounters({ open, onClose }: { open: boolean; onClose: () => void }) {
  const xp = useGame((s) => s.xp)
  const prs = useGame((s) => s.prs)
  const bossesDefeated = useGame((s) => s.bossesDefeated)
  const defeatBoss = useGame((s) => s.defeatBoss)
  const manualHollow = useGame((s) => s.settings.hollowed)
  const battles = useGame((s) => s.battles)
  const hollowed = manualHollow || statusEffects(battles).cursed
  useModalDismiss(open, onClose)

  const [fx, setFx] = useState<Boss | null>(null)

  const level = levelInfo(xp).level
  const defeated = useMemo(() => new Set(bossesDefeated), [bossesDefeated])
  const accent = hollowed ? 'var(--color-humanity)' : 'var(--color-blood-bright)'

  const rows = useMemo(() => {
    const ctx = { level, prs }
    return BOSSES.map((b) => ({ b, state: bossState(b, ctx, defeated), have: prs[b.movement] ?? 0 })).sort(
      (a, x) => RANK[a.state] - RANK[x.state]
    )
  }, [level, prs, defeated])

  const readyCount = rows.filter((r) => r.state === 'ready').length

  const onVanquish = (b: Boss) => {
    defeatBoss(b.id, b.souls, b.trophy)
    setFx(b)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[64] bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Boss Encounters"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
            className="min-h-screen max-w-2xl mx-auto px-5 pb-32"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="divider-ornate flex-1">Boss Encounters</div>
              <button
                onClick={onClose}
                aria-label="close boss encounters"
                className="ml-3 min-h-10 min-w-10 shrink-0 inline-flex items-center justify-center text-bone-dim hover:text-souls transition-colors"
              >
                &times;
              </button>
            </div>
            <p className="font-ui text-xs text-faded mb-5">
              {readyCount > 0 ? (
                <span style={{ color: accent }}>
                  {readyCount} great {readyCount > 1 ? 'enemies await' : 'enemy awaits'} the killing blow.
                </span>
              ) : (
                <>Great enemies of the iron. Grow strong enough, then strike them down.</>
              )}
            </p>

            <div className="space-y-3">
              {rows.map(({ b, state, have }) => {
                const trophy = getItem(b.trophy)
                const pct = Math.max(0, Math.min(100, (have / b.target) * 100))
                return (
                  <div
                    key={b.id}
                    className={`panel panel-ornate p-4 ${state === 'locked' ? 'opacity-55' : ''} ${state === 'felled' ? 'opacity-60' : ''}`}
                    style={{ borderColor: state === 'ready' ? accent : undefined }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-bone text-sm tracking-[0.12em] uppercase truncate">
                        {state === 'locked' ? '??? — Sealed' : b.name}
                      </h3>
                      <span className="font-ui text-[0.55rem] tracking-[0.2em] uppercase shrink-0 text-faded">
                        {b.movement}
                      </span>
                    </div>

                    {state === 'locked' ? (
                      <p className="font-body italic text-faded text-sm mt-2">
                        A foe yet veiled. It reveals itself at{' '}
                        <span className="text-souls-dim">Level {b.unlockLevel}</span>.
                      </p>
                    ) : (
                      <>
                        <p className="font-body italic text-bone-dim text-sm leading-snug mt-1 mb-3">{b.lore}</p>

                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-display text-[0.6rem] tracking-[0.2em] uppercase text-souls-dim">
                            Challenge · {b.movement} &ge; {b.target} lb
                          </span>
                          <span className="font-ui text-[0.65rem] text-souls-dim">
                            &#9737; {b.souls.toLocaleString()}
                            {trophy && <> &middot; {trophy.name}</>}
                          </span>
                        </div>

                        {state !== 'felled' && (
                          <>
                            <div className="h-2 bg-abyss border border-ash overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.9, ease: 'easeOut' }}
                                className="h-full"
                                style={{ background: `linear-gradient(90deg, var(--color-ember-deep), ${accent})` }}
                              />
                            </div>
                            <div className="font-ui text-[0.6rem] text-faded mt-1 text-right">
                              thy best: {Math.floor(have)} / {b.target} lb
                            </div>
                          </>
                        )}

                        <div className="mt-3">
                          {state === 'felled' ? (
                            <div className="flex items-center gap-2 font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">
                              <span className="text-souls">&#10003;</span> Enemy Felled
                            </div>
                          ) : state === 'ready' ? (
                            <button
                              onClick={() => onVanquish(b)}
                              className="btn-ember w-full min-h-11 text-[0.65rem]"
                            >
                              Strike the Killing Blow
                            </button>
                          ) : (
                            <div className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-faded">
                              {Math.floor(pct)}% &middot; not yet strong enough
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* ---- Boss Felled overlay ---- */}
          <AnimatePresence>
            {fx && (
              <motion.div
                key={fx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setFx(null)
                }}
                className="fixed inset-0 z-[68] flex items-center justify-center bg-black/85 px-6"
              >
                <motion.div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ background: `radial-gradient(circle at 50% 42%, ${hollowed ? 'rgba(109,168,207,0.7)' : 'rgba(220,38,38,0.55)'}, transparent 70%)` }}
                />
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0, transition: { delay: 0.12, duration: 0.5 } }}
                  className="relative text-center max-w-sm"
                >
                  <h2
                    className="font-display font-bold text-3xl tracking-[0.14em] mb-2 drop-shadow-[0_0_26px_rgba(220,38,38,0.45)]"
                    style={{ color: accent }}
                  >
                    GREAT ENEMY FELLED
                  </h2>
                  <p className="font-display text-bone-dim text-[0.65rem] tracking-[0.3em] uppercase mb-6">
                    {fx.name}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="panel p-3">
                      <div className="stat-souls text-2xl leading-none">+{fx.souls.toLocaleString()}</div>
                      <div className="font-ui text-[0.65rem] text-bone-dim mt-1">Bonus Souls</div>
                    </div>
                    <div className="panel p-3">
                      <div className="stat-souls text-lg leading-tight">{getItem(fx.trophy)?.name ?? '—'}</div>
                      <div className="font-ui text-[0.65rem] text-bone-dim mt-1">Trophy</div>
                    </div>
                  </div>
                  <button onClick={() => setFx(null)} className="btn-ember w-full min-h-12">
                    Claim the Spoils
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
