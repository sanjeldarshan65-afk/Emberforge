import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, levelInfo, statusEffects } from '../state/store'
import { questRows, macroDaysMet } from '../state/quests'
import type { Quest, QuestCategory, QuestContext } from '../state/quests'
import { getItem } from '../state/items'
import { useModalDismiss } from '../ui/useModalDismiss'

/* ================================================================
   COVENANTS — trackable goals whose progress is read live from the
   ledger. Complete one, claim it, and its souls (and sometimes a
   relic) pour into thy keeping.
   ================================================================ */

const CATEGORY_COLOR: Record<QuestCategory, string> = {
  Training: 'var(--color-ember)',
  Nutrition: 'var(--color-verdant)',
  Consistency: 'var(--color-humanity)',
  Ascension: 'var(--color-souls)',
}

export default function TheCovenants({ open, onClose }: { open: boolean; onClose: () => void }) {
  useModalDismiss(open, onClose)
  const xp = useGame((s) => s.xp)
  const prs = useGame((s) => s.prs)
  const battles = useGame((s) => s.battles)
  const rations = useGame((s) => s.rations)
  const macroGoals = useGame((s) => s.macroGoals)
  const vitals = useGame((s) => s.vitals)
  const claimedQuests = useGame((s) => s.claimedQuests)
  const claimQuest = useGame((s) => s.claimQuest)
  const emberBurns = useGame((s) => s.emberBurns)

  const [fx, setFx] = useState<Quest | null>(null)

  const ctx: QuestContext = useMemo(
    () => ({
      level: levelInfo(xp).level,
      battleCount: battles.length,
      streak: statusEffects(battles, emberBurns).streak,
      prs,
      macroDays: macroDaysMet(rations, macroGoals.calories),
      taperRatio: vitals.waist > 0 ? vitals.shoulders / vitals.waist : 0,
    }),
    [xp, prs, battles, rations, macroGoals, vitals, emberBurns]
  )

  const rows = useMemo(() => questRows(ctx, claimedQuests), [ctx, claimedQuests])

  const claimableCount = rows.filter((r) => r.complete && !r.claimed).length

  const isTaper = (q: Quest) => q.objective.kind === 'goldenTaper'
  const fmtNum = (q: Quest, n: number) => (isTaper(q) ? n.toFixed(3) : String(Math.floor(n)))

  const onClaim = (q: Quest) => {
    claimQuest(q.id, q.souls, q.itemReward)
    setFx(q)
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
            aria-label="Sworn Covenants"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
            className="min-h-screen max-w-2xl mx-auto px-5 pb-32"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="divider-ornate flex-1">Covenants</div>
              <button
                onClick={onClose}
                aria-label="close covenants"
                className="ml-3 min-h-10 min-w-10 shrink-0 inline-flex items-center justify-center text-bone-dim hover:text-souls transition-colors"
              >
                &times;
              </button>
            </div>
            <p className="font-ui text-xs text-faded mb-5">
              {claimableCount > 0 ? (
                <span className="text-glow-ember">
                  {claimableCount} covenant{claimableCount > 1 ? 's' : ''} await thy claim.
                </span>
              ) : (
                <>Sworn oaths, tracked against thy deeds. Fulfil them for souls and relics.</>
              )}
            </p>

            <div className="space-y-3">
              {rows.map(({ q, progress, target, complete, claimed, pct }) => {
                const cat = CATEGORY_COLOR[q.category]
                const rewardItem = q.itemReward ? getItem(q.itemReward) : undefined
                return (
                  <div
                    key={q.id}
                    className={`panel panel-ornate p-4 ${claimed ? 'opacity-60' : ''}`}
                    style={{ borderColor: complete && !claimed ? 'var(--color-souls)' : undefined }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-bone text-sm tracking-[0.12em] uppercase truncate">
                        {q.name}
                      </h3>
                      <span
                        className="font-ui text-[0.55rem] tracking-[0.2em] uppercase shrink-0"
                        style={{ color: cat }}
                      >
                        {q.category}
                      </span>
                    </div>
                    <p className="font-body italic text-bone-dim text-sm leading-snug mt-1 mb-3">{q.lore}</p>

                    {/* progress */}
                    <div className="h-2 bg-abyss border border-ash overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-ember-deep via-ember to-souls"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-ui text-[0.65rem] text-faded">
                        {fmtNum(q, Math.min(progress, target))} / {fmtNum(q, target)} {q.unit}
                      </span>
                      <span className="font-ui text-[0.65rem] text-souls-dim">
                        &#9737; {q.souls.toLocaleString()}
                        {rewardItem && <> &middot; {rewardItem.name}</>}
                      </span>
                    </div>

                    {/* state / action */}
                    <div className="mt-3">
                      {claimed ? (
                        <div className="flex items-center gap-2 font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">
                          <span className="text-souls">&#10003;</span> Covenant Sealed
                        </div>
                      ) : complete ? (
                        <button onClick={() => onClaim(q)} className="btn-ember w-full min-h-11 text-[0.65rem]">
                          Claim the Covenant
                        </button>
                      ) : (
                        <div className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-faded">
                          {Math.floor(pct)}% &middot; the oath endures
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* ---- Covenant Fulfilled overlay ---- */}
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
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ background: 'radial-gradient(circle at 50% 42%, rgba(230,195,92,0.8), transparent 70%)' }}
                />
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0, transition: { delay: 0.12, duration: 0.5 } }}
                  className="relative text-center max-w-sm"
                >
                  <h2 className="font-display font-bold text-souls text-3xl tracking-[0.14em] mb-2 drop-shadow-[0_0_26px_rgba(230,195,92,0.5)]">
                    COVENANT FULFILLED
                  </h2>
                  <p className="font-display text-bone-dim text-[0.65rem] tracking-[0.3em] uppercase mb-6">
                    {fx.name}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="panel p-3">
                      <div className="stat-souls text-2xl leading-none">+{fx.souls.toLocaleString()}</div>
                      <div className="font-ui text-[0.65rem] text-bone-dim mt-1">Souls</div>
                    </div>
                    <div className="panel p-3">
                      <div className="stat-souls text-lg leading-tight">
                        {fx.itemReward ? getItem(fx.itemReward)?.name ?? '—' : 'None'}
                      </div>
                      <div className="font-ui text-[0.65rem] text-bone-dim mt-1">Relic</div>
                    </div>
                  </div>
                  <button onClick={() => setFx(null)} className="btn-ember w-full min-h-12">
                    Take up the Boon
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
