import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useGame,
  levelInfo,
  statusEffects,
  ascendCost,
  ASCEND_BONUS,
  ASCEND_REVEAL_LEVEL,
} from '../state/store'
import { useModalDismiss } from '../ui/useModalDismiss'

/* ================================================================
   THE RITE OF ASCENSION — a prestige Cycle (New Journey). Spend an
   escalating pile of souls to pass on the flame; each Cycle grants a
   permanent, stacking souls & XP bonus. Logged battles, PRs and vitals
   are NEVER reset — only the souls are given to the bonfire.
   ================================================================ */

const toRoman = (n: number): string => {
  if (n <= 0) return '0'
  const map: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let r = ''
  let x = n
  for (const [v, s] of map) {
    while (x >= v) {
      r += s
      x -= v
    }
  }
  return r
}

export default function RiteOfAscension({ open, onClose }: { open: boolean; onClose: () => void }) {
  const souls = useGame((s) => s.souls)
  const xp = useGame((s) => s.xp)
  const ascensionLevel = useGame((s) => s.ascensionLevel)
  const ascend = useGame((s) => s.ascend)
  const manualHollow = useGame((s) => s.settings.hollowed)
  const battles = useGame((s) => s.battles)
  const hollowed = manualHollow || statusEffects(battles).cursed
  useModalDismiss(open, onClose)

  const level = levelInfo(xp).level
  const cost = useMemo(() => ascendCost(ascensionLevel), [ascensionLevel])
  const revealed = level >= ASCEND_REVEAL_LEVEL
  const affordable = souls >= cost
  const bonusHeld = ascensionLevel * ASCEND_BONUS
  const bonusNext = (ascensionLevel + 1) * ASCEND_BONUS
  const pct = Math.max(0, Math.min(100, (souls / cost) * 100))
  const accent = hollowed ? 'var(--color-humanity)' : 'var(--color-ember)'

  const [fx, setFx] = useState<number | null>(null)

  const performRite = () => {
    if (ascend()) setFx(ascensionLevel + 1)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[64] bg-black/85 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="The Rite of Ascension"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
            className="min-h-screen max-w-2xl mx-auto px-5 pb-32"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="divider-ornate flex-1">The Rite of Ascension</div>
              <button
                onClick={onClose}
                aria-label="close the rite of ascension"
                className="ml-3 min-h-10 min-w-10 shrink-0 inline-flex items-center justify-center text-bone-dim hover:text-souls transition-colors"
              >
                &times;
              </button>
            </div>
            <p className="font-body italic text-faded text-sm mb-5">
              To ascend is to give thy hoard of souls to the First Flame, and rise the stronger for
              it — forever. The Cycle turns; thou dost not.
            </p>

            {/* ---- current standing ---- */}
            <div className="panel panel-ornate p-5 mb-4 text-center">
              <div className="font-ui text-[0.55rem] tracking-[0.3em] uppercase text-faded mb-1">
                Present Cycle
              </div>
              <div
                className="font-display font-bold text-5xl tracking-[0.1em] leading-none"
                style={{ color: accent }}
              >
                {toRoman(ascensionLevel)}
              </div>
              <div className="font-ui text-xs text-bone-dim mt-3">
                {ascensionLevel > 0 ? (
                  <>
                    Eternal boon held:{' '}
                    <span className="text-souls">
                      +{bonusHeld}% souls &middot; +{bonusHeld}% XP
                    </span>
                  </>
                ) : (
                  <span className="text-faded">Yet unascended — no eternal boon.</span>
                )}
              </div>
            </div>

            {/* ---- the rite ---- */}
            {!revealed ? (
              <div className="panel p-5 text-center opacity-70">
                <div className="font-display text-sm tracking-[0.15em] uppercase text-faded">
                  The Path Lies Sealed
                </div>
                <p className="font-body italic text-faded text-sm mt-2">
                  Prove thyself first. The Rite reveals itself at{' '}
                  <span className="text-souls-dim">Level {ASCEND_REVEAL_LEVEL}</span> — thou art
                  Level {level}.
                </p>
              </div>
            ) : (
              <div className="panel panel-ornate p-5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-display text-sm tracking-[0.15em] uppercase text-bone">
                    Rise to Cycle {toRoman(ascensionLevel + 1)}
                  </span>
                  <span className="font-ui text-[0.6rem] tracking-[0.2em] uppercase text-souls-dim">
                    grants +{bonusNext}% / +{bonusNext}%
                  </span>
                </div>
                <p className="font-body italic text-bone-dim text-sm leading-snug mb-4">
                  The cost is {cost.toLocaleString()} souls, offered to the flame.
                </p>

                <div className="flex items-center justify-between font-ui text-[0.65rem] mb-1.5">
                  <span className="text-faded">
                    &#9737; {souls.toLocaleString()} / {cost.toLocaleString()}
                  </span>
                  <span style={{ color: affordable ? accent : 'var(--color-faded)' }}>
                    {affordable ? 'the flame accepts thee' : `need ${(cost - souls).toLocaleString()} more`}
                  </span>
                </div>
                <div className="h-2.5 bg-abyss border border-ash overflow-hidden mb-5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="h-full"
                    style={{ background: `linear-gradient(90deg, var(--color-ember-deep), ${accent})` }}
                  />
                </div>

                <button
                  onClick={performRite}
                  disabled={!affordable}
                  className={`btn-ember w-full min-h-12 ${!affordable ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Perform the Rite of Ascension
                </button>
              </div>
            )}

            <p className="font-body italic text-faded text-xs text-center mt-6 leading-relaxed">
              The Rite spends only thy souls. Every logged battle, every record, every measure of thy
              body remains — the flame is passed on, thy history is not undone.
            </p>
          </motion.div>

          {/* ---- Ascension fanfare ---- */}
          <AnimatePresence>
            {fx !== null && (
              <motion.div
                key={fx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setFx(null)
                }}
                className="fixed inset-0 z-[68] flex items-center justify-center bg-black/90 px-6"
              >
                <motion.div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                  style={{
                    background: `radial-gradient(circle at 50% 45%, ${hollowed ? 'rgba(109,168,207,0.75)' : 'rgba(255,138,42,0.6)'}, transparent 72%)`,
                  }}
                />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.55 } }}
                  className="relative text-center max-w-sm"
                >
                  <div className="font-ui text-[0.6rem] tracking-[0.35em] uppercase text-bone-dim mb-2">
                    The Flame is Rekindled
                  </div>
                  <h2
                    className="font-display font-bold text-4xl tracking-[0.12em] mb-1"
                    style={{ color: accent, textShadow: `0 0 30px ${accent}` }}
                  >
                    ASCENDED
                  </h2>
                  <p className="font-display text-souls text-lg tracking-[0.3em] uppercase mb-6">
                    Cycle {toRoman(fx)}
                  </p>
                  <div className="panel p-4 mb-6">
                    <div className="stat-souls text-2xl leading-none">
                      +{fx * ASCEND_BONUS}% / +{fx * ASCEND_BONUS}%
                    </div>
                    <div className="font-ui text-[0.65rem] text-bone-dim mt-1">
                      Eternal souls &amp; XP, on every battle to come
                    </div>
                  </div>
                  <button onClick={() => setFx(null)} className="btn-ember w-full min-h-12">
                    Walk on, Unkindled
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
