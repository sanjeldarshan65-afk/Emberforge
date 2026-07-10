import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../state/store'
import { useModalDismiss } from '../ui/useModalDismiss'

/* ================================================================
   PLATE BLACKSMITH — which plates make the bar?
   Greedy fill per side; muted gym-standard colors, dark-fantasy cut.
   ================================================================ */

type PlateSpec = { weight: number; color: string; h: number; w: number }

const LB_PLATES: PlateSpec[] = [
  { weight: 55, color: '#7f2d2d', h: 96, w: 13 },
  { weight: 45, color: '#2d4a66', h: 96, w: 12 },
  { weight: 35, color: '#6b6222', h: 84, w: 11 },
  { weight: 25, color: '#3f5c3a', h: 72, w: 10 },
  { weight: 10, color: '#5a5347', h: 52, w: 8 },
  { weight: 5, color: '#37475a', h: 40, w: 7 },
  { weight: 2.5, color: '#4d4335', h: 30, w: 6 },
]

const KG_PLATES: PlateSpec[] = [
  { weight: 25, color: '#7f2d2d', h: 96, w: 13 },
  { weight: 20, color: '#2d4a66', h: 96, w: 12 },
  { weight: 15, color: '#6b6222', h: 84, w: 11 },
  { weight: 10, color: '#3f5c3a', h: 72, w: 10 },
  { weight: 5, color: '#5a5347', h: 52, w: 8 },
  { weight: 2.5, color: '#37475a', h: 40, w: 7 },
  { weight: 1.25, color: '#4d4335', h: 30, w: 6 },
]

function solve(target: number, bar: number, plates: PlateSpec[]) {
  let perSide = (target - bar) / 2
  const loaded: PlateSpec[] = []
  for (const p of plates) {
    while (perSide >= p.weight - 1e-9) {
      loaded.push(p)
      perSide -= p.weight
    }
  }
  return { loaded, remainder: perSide * 2 }
}

type WarmRung = { weight: number; reps: number }

/** a sensible warm-up ramp toward a working weight, rounded to loadable steps.
    Light working weights collapse to fewer rungs; returns [] at or below the bar. */
function warmupRamp(working: number, bar: number, unit: 'lb' | 'kg'): WarmRung[] {
  const step = unit === 'kg' ? 2.5 : 5
  const round = (w: number) => Math.round(w / step) * step
  const rungs: { pct: number; reps: number }[] = [
    { pct: 0, reps: 8 }, // the empty bar
    { pct: 0.4, reps: 5 },
    { pct: 0.55, reps: 4 },
    { pct: 0.7, reps: 3 },
    { pct: 0.85, reps: 2 },
  ]
  const out: WarmRung[] = []
  let last = -1
  for (const r of rungs) {
    let w = r.pct === 0 ? bar : round(working * r.pct)
    if (w < bar) w = bar
    if (w >= working || w === last) continue // never meet/exceed the work set; no duplicates
    out.push({ weight: w, reps: r.reps })
    last = w
  }
  return out
}

export default function PlateForge({
  weight,
  onClose,
}: {
  weight: number | null
  onClose: () => void
}) {
  useModalDismiss(weight !== null, onClose)
  const units = useGame((s) => s.settings.units)
  const bar = useGame((s) => s.settings.barWeight)
  const plates = units === 'kg' ? KG_PLATES : LB_PLATES

  const open = weight !== null && weight > bar
  const { loaded, remainder } = open ? solve(weight, bar, plates) : { loaded: [], remainder: 0 }
  const ramp = weight !== null ? warmupRamp(weight, bar, units) : []

  /* tally for the written recipe */
  const tally = loaded.reduce<Record<number, number>>((t, p) => {
    t[p.weight] = (t[p.weight] ?? 0) + 1
    return t
  }, {})

  /* sleeve geometry */
  let cursor = 64
  const placed = loaded.map((p) => {
    const x = cursor
    cursor += p.w + 3
    return { ...p, x }
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[62] bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Plate Calculator"
            className="absolute bottom-0 inset-x-0 border-t border-souls-dim/50 bg-void/75 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),1rem)]"
          >
            <div className="max-w-2xl mx-auto px-5 pt-5">
              <div className="divider-ornate mb-4">The Plate Blacksmith</div>

              <div className="flex items-baseline justify-between mb-1">
                <span className="stat-souls text-3xl">
                  {weight} <span className="text-sm text-souls-dim">{units}</span>
                </span>
                <span className="font-ui text-xs text-faded">
                  bar {bar} {units} &middot; one side shown
                </span>
              </div>

              {/* the sleeve */}
              <svg viewBox="0 0 320 140" className="w-full" role="img" aria-label="barbell loading diagram">
                {/* bar shaft */}
                <rect x="0" y="66" width="320" height="8" fill="#221c15" stroke="#4d4335" strokeWidth="1" />
                {/* collar */}
                <rect x="46" y="58" width="14" height="24" fill="#2e271e" stroke="#9c7f35" strokeWidth="1" />
                {/* plates */}
                {placed.map((p, i) => (
                  <motion.g key={i} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.05 }}>
                    <rect
                      x={p.x}
                      y={70 - p.h / 2}
                      width={p.w}
                      height={p.h}
                      rx="2"
                      fill={p.color}
                      stroke="#0a0806"
                      strokeWidth="1.5"
                    />
                    <text
                      x={p.x + p.w / 2}
                      y={70 - p.h / 2 - 5}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#a89e86"
                      fontFamily="Inter, sans-serif"
                    >
                      {p.weight}
                    </text>
                  </motion.g>
                ))}
                {/* sleeve end */}
                <rect x={Math.max(cursor + 4, 70)} y="63" width="30" height="14" fill="#17130f" stroke="#4d4335" strokeWidth="1" />
              </svg>

              {/* the recipe */}
              {loaded.length > 0 ? (
                <p className="text-bone-dim text-sm text-center mt-1">
                  per side:{' '}
                  <span className="text-souls font-ui text-xs">
                    {Object.entries(tally)
                      .sort((a, b) => Number(b[0]) - Number(a[0]))
                      .map(([w, n]) => `${w} × ${n}`)
                      .join('  ·  ')}
                  </span>
                </p>
              ) : (
                <p className="text-faded italic text-sm text-center mt-1">The bar alone suffices.</p>
              )}

              {remainder > 0.01 && (
                <p className="text-glow-ember font-ui text-xs text-center mt-1">
                  {remainder.toFixed(1)} {units} cannot be forged — nearest load shown
                </p>
              )}

              {/* warm-up ramp — how to climb toward this working weight */}
              {ramp.length > 0 && (
                <div className="mt-4 pt-3 border-t border-ash">
                  <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim mb-2 text-center">
                    Warm-up Ramp
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-ui text-xs">
                    {ramp.map((r, i) => (
                      <span key={i} className="text-bone-dim whitespace-nowrap">
                        {r.weight}
                        <span className="text-faded"> &times; {r.reps}</span>
                        <span className="text-stone"> &rarr;</span>
                      </span>
                    ))}
                    <span className="text-souls whitespace-nowrap">
                      {weight} <span className="text-souls-dim">&times; work</span>
                    </span>
                  </div>
                </div>
              )}

              <button onClick={onClose} className="btn-hollow w-full min-h-12 mt-4 mb-2">
                Return to Battle
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
