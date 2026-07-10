import { motion, AnimatePresence } from 'framer-motion'
import { useGame, levelInfo } from '../state/store'
import { RANKS, rankForLevel, nextRank, rankProgress } from '../state/ranks'
import { useModalDismiss } from '../ui/useModalDismiss'

/* ================================================================
   THE RANKS — a named ladder laid over the numeric level. Climbing
   is automatic (XP drives it); this screen exists so the climb has
   a face and a name, not just a number ticking up.
   ================================================================ */

export default function RanksLadder({ open, onClose }: { open: boolean; onClose: () => void }) {
  useModalDismiss(open, onClose)
  const xp = useGame((s) => s.xp)
  const { level } = levelInfo(xp)
  const current = rankForLevel(level)
  const next = nextRank(level)
  const pct = rankProgress(level) * 100

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
            aria-label="The Ranks"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
            className="min-h-screen max-w-2xl mx-auto px-4 pb-32"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="divider-ornate flex-1">The Ranks</div>
              <button
                onClick={onClose}
                aria-label="close the ranks"
                className="ml-3 min-h-10 min-w-10 shrink-0 inline-flex items-center justify-center text-bone-dim hover:text-souls transition-colors"
              >
                &times;
              </button>
            </div>
            <p className="font-body italic text-faded text-sm mb-5">
              A name for how far the fire has carried thee. The climb never pauses — every rep feeds it.
            </p>

            {/* current standing */}
            <div className="panel panel-ornate p-5 mb-6 text-center">
              <div
                className="w-16 h-16 mx-auto rounded-full border-2 flex items-center justify-center mb-3"
                style={{
                  borderColor: current.color,
                  color: current.color,
                  boxShadow: `0 0 18px ${current.color}55`,
                  background: `radial-gradient(circle, ${current.color}22, transparent 70%)`,
                }}
              >
                <span className="text-2xl leading-none">{current.glyph}</span>
              </div>
              <div
                className="font-display text-lg tracking-[0.2em] uppercase"
                style={{ color: current.color }}
              >
                {current.name}
              </div>
              <div className="font-ui text-xs text-bone-dim mt-1">Level {level}</div>

              {next ? (
                <>
                  <div className="h-1.5 bg-abyss border border-ash overflow-hidden mt-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-ember-deep to-souls"
                    />
                  </div>
                  <div className="font-ui text-[0.65rem] text-faded mt-2">
                    Lv {level} of {next.minLevel} to reach <span className="text-bone-dim">{next.name}</span>
                  </div>
                </>
              ) : (
                <div className="font-ui text-[0.65rem] text-souls-dim mt-4 tracking-[0.15em] uppercase">
                  the summit — no rank stands above thee
                </div>
              )}
            </div>

            {/* the ladder */}
            <div className="space-y-0">
              {[...RANKS].reverse().map((r, i) => {
                const reached = level >= r.minLevel
                const isCurrent = r.key === current.key
                return (
                  <div key={r.key} className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center w-10 shrink-0">
                      <div
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 my-1"
                        style={{
                          borderColor: reached ? r.color : 'var(--color-ash)',
                          color: reached ? r.color : 'var(--color-faded)',
                          background: isCurrent ? `radial-gradient(circle, ${r.color}33, transparent 70%)` : 'transparent',
                          boxShadow: isCurrent ? `0 0 10px ${r.color}66` : 'none',
                        }}
                      >
                        <span className="text-xs leading-none">{r.glyph}</span>
                      </div>
                      {i < RANKS.length - 1 && (
                        <div
                          className="w-px flex-1"
                          style={{ background: reached ? r.color : 'var(--color-ash)', opacity: reached ? 0.5 : 1 }}
                        />
                      )}
                    </div>
                    <div className={`flex-1 flex items-center justify-between py-2 ${isCurrent ? '' : reached ? '' : 'opacity-50'}`}>
                      <div>
                        <div
                          className="font-display text-sm tracking-[0.15em] uppercase"
                          style={{ color: reached ? 'var(--color-bone)' : 'var(--color-faded)' }}
                        >
                          {r.name}
                        </div>
                        <div className="font-ui text-[0.65rem] text-faded">Level {r.minLevel}+</div>
                      </div>
                      {isCurrent && (
                        <span
                          className="font-display text-[0.55rem] tracking-[0.25em] uppercase shrink-0"
                          style={{ color: r.color }}
                        >
                          thou art here
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
