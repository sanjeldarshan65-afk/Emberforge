import { Fragment, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MUSCLE_GROUPS, recoveryHoursLeft } from '../state/recovery'
import type { FatigueMap, MuscleGroup } from '../state/recovery'
import { FRONT, BACK, BODY } from './avatarAnatomy'
import type { MShape } from './avatarAnatomy'

/* ================================================================
   THE VESSEL — an anatomical muscle heatmap.
   A full figure (front & back) whose muscle groups light ember with
   the work logged in the Combat Log, then cool to their resting
   relief over ~48h. Tap a muscle for a glass reading of its embers.
   ================================================================ */

const EMPTY_FATIGUE = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as FatigueMap

const emberStatus = (f: number) =>
  f < 0.12 ? 'Cool to the touch'
  : f < 0.4 ? 'Embers smouldering'
  : f < 0.7 ? 'Embers burning'
  : 'Embers roaring'

/* ---------- muscle geometry lives in avatarAnatomy.ts ---------- */

type ShapeProps = { fill?: string; opacity?: number; stroke?: string; strokeWidth?: number }

function Shape({ s, ...p }: { s: MShape } & ShapeProps) {
  const props = { ...p, vectorEffect: 'non-scaling-stroke' as const }
  if (s.t === 'e') return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...props} />
  if (s.t === 'r') return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...props} />
  return <path d={s.d} {...props} />
}

/* renders each shape, plus its mirror across the midline when marked —
   the figure stays symmetric by construction */
function ShapeSet({ shapes, ...p }: { shapes: MShape[] } & ShapeProps) {
  return (
    <>
      {shapes.map((s, i) => (
        <Fragment key={i}>
          <Shape s={s} {...p} />
          {s.m && (
            <g transform="translate(200 0) scale(-1 1)">
              <Shape s={s} {...p} />
            </g>
          )}
        </Fragment>
      ))}
    </>
  )
}

type Tip = { group: MuscleGroup; x: number; y: number }

export default function Avatar({
  ratio,
  cursed,
  ascended,
  fatigue = EMPTY_FATIGUE,
}: {
  ratio: number
  cursed: boolean
  ascended: boolean
  fatigue?: FatigueMap
}) {
  const [tip, setTip] = useState<Tip | null>(null)
  const [view, setView] = useState<'front' | 'back'>('front')
  const stageRef = useRef<HTMLDivElement>(null)

  /* taper (1.1 hollow → 1.618 legend) subtly broadens the frame */
  const t = Math.max(0, Math.min((ratio - 1.1) / (1.618 - 1.1), 1))
  const sx = 1 + t * 0.08

  const muscles = view === 'front' ? FRONT : BACK

  const onRegion = (group: MuscleGroup, e: ReactMouseEvent) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip((prev) =>
      prev?.group === group ? null : { group, x: e.clientX - rect.left, y: e.clientY - rect.top }
    )
  }

  const stroke = cursed
    ? 'var(--color-stone)'
    : ascended
      ? 'var(--color-souls)'
      : 'var(--color-souls-dim)'

  const tipF = tip ? fatigue[tip.group] ?? 0 : 0
  const tipHot = tipF > 0.02
  const tipHours = recoveryHoursLeft(tipF)
  const tipBelow = tip ? tip.y < 60 : false

  return (
    <div className="flex flex-col items-center">
      <div ref={stageRef} className="relative">
        <svg
          viewBox="0 0 200 300"
          className={`h-64 ${cursed ? '[filter:grayscale(0.5)_brightness(0.85)]' : ''} ${
            ascended ? 'drop-shadow-[0_0_14px_rgba(230,195,92,0.4)]' : ''
          }`}
          role="img"
          aria-label={`thy vessel, ${view} — tap a muscle to read its embers`}
        >
          <defs>
            <filter id="heatBlur" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.4" />
            </filter>
            <filter id="curseBlur" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* ascension halo */}
          {ascended && (
            <motion.ellipse
              cx="100" cy="150" rx="70" ry="140"
              fill="rgba(230,195,92,0.10)"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* dismiss reading on empty tap */}
          {tip && (
            <rect x="0" y="0" width="200" height="300" fill="transparent" onClick={() => setTip(null)} />
          )}

          <g transform={`translate(100 0) scale(${sx} 1) translate(-100 0)`}>
            {/* ---- body silhouette ---- */}
            <g fill="var(--color-charcoal)" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" pointerEvents="none">
              <circle cx="100" cy="24" r="13" />
              <ShapeSet shapes={BODY} />
            </g>

            {/* ---- muscles: resting relief + ember heat ---- */}
            {MUSCLE_GROUPS.map((group) => {
              const shapes = muscles[group]
              if (!shapes.length) return null
              const f = fatigue[group] ?? 0
              const hot = f > 0.02
              const selected = tip?.group === group
              return (
                <g
                  key={group}
                  onClick={(e) => onRegion(group, e)}
                  className="cursor-pointer"
                  aria-label={`${group}: ${emberStatus(f)}`}
                >
                  {/* resting relief — always visible, defines the muscle */}
                  <ShapeSet
                    shapes={shapes}
                    fill="var(--color-stone)"
                    opacity={selected ? 0.55 : 0.26}
                    stroke={selected ? 'var(--color-souls)' : undefined}
                    strokeWidth={selected ? 1 : undefined}
                  />
                  {/* ember heat — grows with fatigue, breathing while hot */}
                  {hot && (
                    <motion.g
                      filter="url(#heatBlur)"
                      initial={false}
                      animate={{ opacity: [f * 0.5, f * 0.82, f * 0.5] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <ShapeSet shapes={shapes} fill="var(--color-ember)" />
                    </motion.g>
                  )}
                  {/* white-hot core when truly aflame */}
                  {f > 0.66 && (
                    <ShapeSet shapes={shapes} fill="var(--color-ember-bright)" opacity={(f - 0.66) * 1.6} />
                  )}
                </g>
              )
            })}

            {/* ---- Curse Mark of Death — brands the upper-left chest/shoulder while Hollowed ---- */}
            {cursed && view === 'front' && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                pointerEvents="none"
              >
                <circle cx="78" cy="86" r="14" fill="rgba(220,38,38,0.30)" filter="url(#curseBlur)" />
                <g transform="translate(78 86) scale(0.82)" fill="none" stroke="var(--color-blood-bright)" strokeWidth="2" strokeLinecap="square">
                  <path d="M -9 -10 L -1 -2 L -8 4 L 1 9" />
                  <path d="M 7 -11 L -3 2 L 9 11" />
                  <circle cx="0" cy="0" r="12" strokeWidth="0.9" strokeDasharray="4 6" opacity="0.7" />
                </g>
              </motion.g>
            )}
          </g>
        </svg>

        {/* ---- glass sigil-tooltip, pinned to the tap ---- */}
        <AnimatePresence>
          {tip && (
            <motion.div
              key={`${view}-${tip.group}`}
              initial={{ opacity: 0, scale: 0.9, y: tipBelow ? -6 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.14 } }}
              transition={{ type: 'spring', stiffness: 460, damping: 30 }}
              onClick={() => setTip(null)}
              style={{ left: tip.x, top: tip.y, transform: `translate(-50%, ${tipBelow ? '16%' : '-116%'})` }}
              className="pointer-events-auto absolute z-20 w-max max-w-[12.5rem] cursor-pointer select-none border border-souls-dim/40 bg-[rgba(14,11,8,0.6)] px-3 py-2 shadow-[0_10px_34px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-2">
                <motion.span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: tipHot ? 'var(--color-ember)' : 'var(--color-souls-dim)',
                    boxShadow: tipHot ? '0 0 8px var(--color-ember)' : 'none',
                  }}
                  animate={tipHot ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="font-display text-[0.62rem] tracking-[0.22em] uppercase text-souls">
                  {tip.group}
                </span>
              </div>
              <p className="mt-1 font-ui text-[0.7rem] leading-snug text-bone-dim">
                {emberStatus(tipF)}.{' '}
                {tipHot ? (
                  <>
                    <span className="text-souls">{tipHours}h</span> until restored.
                  </>
                ) : (
                  <span className="text-bone-dim">Fully restored.</span>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- front / back toggle ---- */}
      <div className="mt-3 inline-flex border border-ash overflow-hidden">
        {(['front', 'back'] as const).map((v) => (
          <button
            key={v}
            onClick={() => {
              setView(v)
              setTip(null)
            }}
            className={`px-4 min-h-9 font-display text-[0.58rem] tracking-[0.2em] uppercase transition-colors ${
              view === v ? 'bg-iron text-souls' : 'text-faded hover:text-bone-dim'
            }`}
          >
            {v === 'front' ? 'Fore' : 'Aft'}
          </button>
        ))}
      </div>

      <p className={`font-ui text-[0.65rem] text-faded mt-2 transition-opacity ${tip ? 'opacity-0' : 'opacity-100'}`}>
        tap a muscle to read its embers
      </p>
    </div>
  )
}
