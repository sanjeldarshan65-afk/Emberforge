import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../state/store'
import { MUSCLE_GROUPS } from '../state/exercises'
import { weeklyMuscleVolume, neglectedRegion, BALANCE_WINDOW_DAYS } from '../state/balance'

/* ================================================================
   THE BODY'S BALANCE — a weekly bar reading of how the iron fell
   across each region, with the least-tended region flagged in blood.
   ================================================================ */

export default function MuscleBalance() {
  const battles = useGame((s) => s.battles)
  const units = useGame((s) => s.settings.units)

  const bal = useMemo(() => weeklyMuscleVolume(battles), [battles])
  const max = Math.max(...MUSCLE_GROUPS.map((g) => bal[g]), 1)
  const total = MUSCLE_GROUPS.reduce((t, g) => t + bal[g], 0)
  const neglected = neglectedRegion(bal)

  if (total <= 0) {
    return (
      <div className="panel panel-ornate p-5 text-center">
        <p className="font-body italic text-bone-dim text-sm">
          No iron has been moved these seven days. Fight, and the fire shall fall across thy frame.
        </p>
      </div>
    )
  }

  return (
    <div className="panel panel-ornate p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-display text-[0.65rem] tracking-[0.25em] uppercase text-souls-dim">
          Last {BALANCE_WINDOW_DAYS} days
        </span>
        <span className="font-ui text-[0.6rem] text-faded">
          {Math.round(total).toLocaleString()} {units} across the frame
        </span>
      </div>

      <div className="space-y-2">
        {MUSCLE_GROUPS.map((g) => {
          const pct = (bal[g] / max) * 100
          const isNeglected = g === neglected
          return (
            <div key={g} className="flex items-center gap-3">
              <span
                className={`font-display text-[0.6rem] tracking-[0.15em] uppercase w-20 shrink-0 ${
                  isNeglected ? 'text-blood-bright' : 'text-bone-dim'
                }`}
              >
                {g}
              </span>
              <div className="flex-1 h-3 bg-abyss border border-ash overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full"
                  style={{
                    background: isNeglected
                      ? 'var(--color-stone)'
                      : 'linear-gradient(90deg, var(--color-ember-deep), var(--color-ember))',
                  }}
                />
              </div>
              <span className="font-ui text-[0.6rem] text-faded w-12 text-right shrink-0">
                {Math.round(bal[g]).toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>

      {neglected && bal[neglected] < max * 0.5 && (
        <p className="font-body italic text-faded text-xs mt-3">
          Least tended: <span className="text-blood-bright">{neglected}</span>. Grant it the iron
          before the imbalance festers.
        </p>
      )}
    </div>
  )
}
