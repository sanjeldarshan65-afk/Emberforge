import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGame, todayKey } from '../state/store'
import { dailyForDay, dailyProgress } from '../state/daily'
import { useToast } from '../ui/toastContext'

/* ================================================================
   THE DAILY EMBER — one small trial per day, the reason to return
   tomorrow. Compact by design: a single strip under the header,
   never competing with the character sheet for the fold.
   ================================================================ */

export default function DailyEmberCard() {
  const battles = useGame((s) => s.battles)
  const rations = useGame((s) => s.rations)
  const weighIns = useGame((s) => s.weighIns)
  const macroGoals = useGame((s) => s.macroGoals)
  const claimedDailies = useGame((s) => s.claimedDailies)
  const claimDaily = useGame((s) => s.claimDaily)
  const toast = useToast()

  const dayKey = todayKey()
  const ember = useMemo(() => dailyForDay(dayKey), [dayKey])
  const { progress, target } = useMemo(
    () => dailyProgress(ember, { battles, rations, weighIns, macroGoals, dayKey }),
    [ember, battles, rations, weighIns, macroGoals, dayKey]
  )
  const claimed = claimedDailies.includes(dayKey)
  const complete = progress >= target
  const pct = Math.max(0, Math.min(100, (progress / target) * 100))

  const onClaim = () => {
    claimDaily(dayKey, ember.souls)
    toast(`+ ${ember.souls} Souls — the ember is thine`, 'souls')
  }

  return (
    <div
      className="panel panel-ornate px-4 py-3"
      style={{ borderColor: complete && !claimed ? 'var(--color-souls)' : undefined }}
    >
      <div className="flex items-center gap-3">
        {/* the ember itself */}
        <span
          aria-hidden
          className={`text-lg leading-none shrink-0 ${
            claimed ? 'text-souls' : complete ? 'text-ember animate-flicker' : 'text-faded'
          }`}
        >
          {claimed ? '✓' : '◆'}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">
              Daily Ember
            </span>
            <span className="font-ui text-[0.65rem] text-souls-dim shrink-0">
              &#9737; {ember.souls}
            </span>
          </div>
          <div className="font-display text-bone text-sm tracking-[0.08em] truncate">{ember.name}</div>
          {!claimed && (
            <p className="font-body italic text-bone-dim text-xs leading-snug truncate">{ember.charge}</p>
          )}

          {/* progress */}
          {!claimed && (
            <>
              <div className="h-1 bg-abyss border border-ash overflow-hidden mt-1.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-ember-deep to-souls"
                />
              </div>
              <div className="font-ui text-[0.6rem] text-faded mt-0.5">
                {Math.floor(progress).toLocaleString()} / {target.toLocaleString()} {ember.unit}
              </div>
            </>
          )}
          {claimed && (
            <div className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-souls-dim mt-0.5">
              claimed &middot; another kindles at dawn
            </div>
          )}
        </div>

        {complete && !claimed && (
          <button onClick={onClaim} className="btn-ember shrink-0 min-h-10 px-4 text-[0.6rem]">
            Claim
          </button>
        )}
      </div>
    </div>
  )
}
