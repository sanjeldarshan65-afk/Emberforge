import { motion, AnimatePresence } from 'framer-motion'
import { useGame, statusEffects, EMBER_BANK_COST, EMBER_BANK_MAX, localDayKey, todayKey } from '../state/store'
import { useModalDismiss } from '../ui/useModalDismiss'
import { useToast } from '../ui/toastContext'

/* ================================================================
   THE STREAK & EMBER BANK — tap the header flame to arrive here.
   The streak is the chain of battle days; a banked ember burns in
   thy stead when a rest day would break it (Duolingo's freeze,
   recast in the forge). The bank shields the streak, not the Curse.
   ================================================================ */

export default function StreakSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useModalDismiss(open, onClose)
  const battles = useGame((s) => s.battles)
  const emberBank = useGame((s) => s.emberBank)
  const emberBurns = useGame((s) => s.emberBurns)
  const souls = useGame((s) => s.souls)
  const bankEmber = useGame((s) => s.bankEmber)
  const toast = useToast()

  const { streak, daysSinceLast } = statusEffects(battles, emberBurns)
  const trainedToday = battles.length > 0 && localDayKey(battles[0].date) === todayKey()
  const atRisk = streak > 0 && !trainedToday && emberBank === 0
  const shielded = streak > 0 && !trainedToday && emberBank > 0
  const canBank = souls >= EMBER_BANK_COST && emberBank < EMBER_BANK_MAX

  const onBank = () => {
    if (bankEmber()) toast('An ember banked — the chain is shielded', 'souls')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[64] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ scale: 0.94, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1, transition: { duration: 0.3 } }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Streak and Ember Bank"
            className="panel panel-ornate w-full max-w-sm p-5"
          >
            <div className="divider-ornate mb-4">The Unbroken Chain</div>

            {/* current streak */}
            <div className="text-center mb-5">
              <div
                className={`text-4xl leading-none mb-1 ${
                  streak > 0 ? 'text-ember-bright' : 'text-faded'
                } ${atRisk ? 'animate-flicker' : ''}`}
                aria-hidden
              >
                &#128293;
              </div>
              <div className="stat-souls text-3xl leading-none">{streak}</div>
              <div className="font-ui text-xs text-bone-dim mt-1">
                day{streak === 1 ? '' : 's'} of unbroken fire
              </div>
              <p className="font-body italic text-sm mt-2 leading-snug text-bone-dim">
                {trainedToday
                  ? 'Today’s battle is fought. The chain holds until tomorrow asks again.'
                  : atRisk
                    ? 'The fire gutters — no battle yet today, and no ember stands ready. Train before midnight or the chain breaks.'
                    : shielded
                      ? 'No battle yet today — but a banked ember will burn in thy stead if the day escapes thee.'
                      : streak === 0 && daysSinceLast !== null
                        ? 'The chain lies cold. A battle today kindles it anew.'
                        : 'No chain yet. The first battle forges the first link.'}
              </p>
            </div>

            {/* the ember bank */}
            <div className="border-t border-ash pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[0.65rem] tracking-[0.25em] uppercase text-souls-dim">
                  The Ember Bank
                </span>
                <span className="text-estus text-sm tracking-widest" aria-label={`${emberBank} of ${EMBER_BANK_MAX} embers banked`}>
                  {'⬩'.repeat(emberBank)}
                  <span className="text-faded">{'⬦'.repeat(EMBER_BANK_MAX - emberBank)}</span>
                </span>
              </div>
              <p className="font-body italic text-bone-dim text-sm leading-snug mb-4">
                A banked ember burns of its own accord when a rest day would break the chain —
                the streak survives, the ember is spent. It shields the streak alone; the Curse
                of Hollowing heeds no ember.
              </p>

              <button
                onClick={onBank}
                disabled={!canBank}
                className={`w-full min-h-12 font-display text-[0.65rem] tracking-[0.2em] uppercase transition-colors ${
                  canBank
                    ? 'btn-ember'
                    : 'border border-ash text-faded cursor-default'
                }`}
              >
                {emberBank >= EMBER_BANK_MAX
                  ? 'The bank is full'
                  : souls < EMBER_BANK_COST
                    ? `Bank an Ember · need ☉${(EMBER_BANK_COST - souls).toLocaleString()} more`
                    : `Bank an Ember · ☉${EMBER_BANK_COST.toLocaleString()}`}
              </button>
            </div>

            <button onClick={onClose} className="btn-hollow w-full min-h-11 mt-4">
              Return to the Sanctum
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
