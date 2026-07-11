import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ================================================================
   KINDLE THE IRON — a warm-up ramp for the working weight.
   Classic ladder: the empty bar, then 40% × 5, 60% × 3, 80% × 1,
   rounded to real plate increments. Tap a rung above the bar to
   open the Plate Blacksmith with that weight loaded.
   ================================================================ */

const RUNGS = [
  { pct: 0, reps: 10 }, // the empty bar
  { pct: 0.4, reps: 5 },
  { pct: 0.6, reps: 3 },
  { pct: 0.8, reps: 1 },
]

export default function WarmupRamp({
  target,
  bar,
  units,
  onForge,
}: {
  target: number
  bar: number
  units: string
  onForge: (weight: number) => void
}) {
  const [open, setOpen] = useState(false)
  if (!(target > bar)) return null

  const inc = units === 'kg' ? 2.5 : 5
  const steps = RUNGS.map(({ pct, reps }) => {
    const raw = pct === 0 ? bar : Math.round((target * pct) / inc) * inc
    return { weight: Math.max(bar, raw), reps, isBar: pct === 0 }
  }).filter((s, i, a) => i === 0 || s.weight > a[i - 1].weight) // drop rungs that collapse into the bar

  return (
    <div className="panel p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full min-h-8 flex items-center justify-between gap-3 text-left"
      >
        <span className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-souls-dim">
          Kindle the Iron &middot; warm-up for {target} {units}
        </span>
        <span className={`text-souls-dim transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden>
          &#9662;
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pt-2.5">
              {steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => !s.isBar && onForge(s.weight)}
                  disabled={s.isBar}
                  aria-label={
                    s.isBar
                      ? `empty bar, ${s.reps} reps`
                      : `warm-up ${s.weight} ${units} for ${s.reps} reps — open plate blacksmith`
                  }
                  className={`min-h-10 px-3 border font-ui text-xs transition-colors ${
                    s.isBar
                      ? 'border-ash text-faded'
                      : 'border-souls-dim/50 text-bone-dim active:border-ember active:text-ember'
                  }`}
                >
                  <span className="stat-souls text-sm">{s.weight}</span>
                  <span className="text-faded"> × {s.reps}</span>
                  {s.isBar && <span className="text-faded font-ui text-[0.6rem]"> · bar</span>}
                </button>
              ))}
            </div>
            <p className="font-ui text-[0.6rem] text-faded mt-2">
              tap a rung for its plate math &middot; then face the true weight
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
