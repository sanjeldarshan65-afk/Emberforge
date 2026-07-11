import { motion } from 'framer-motion'

/* ================================================================
   THE BONFIRE — a sword rested in an ash mound, flame breathing,
   embers rising. The centerpiece of the title screen. Draws all
   fire from the ember tokens, so it cools to spectral blue in
   Hollowed mode; framer's global MotionConfig honors
   prefers-reduced-motion.
   ================================================================ */

/* deterministic ember sparks — no randomness, same fire every boot */
const SPARKS = [
  { x: -14, delay: 0.2, dur: 3.2, drift: -7 },
  { x: -5, delay: 1.4, dur: 2.7, drift: 6 },
  { x: 7, delay: 0.7, dur: 3.6, drift: -5 },
  { x: 15, delay: 2.0, dur: 2.9, drift: 8 },
  { x: 1, delay: 2.6, dur: 3.1, drift: -9 },
]

export default function Bonfire({ className = 'w-28 h-28' }: { className?: string }) {
  return (
    <div className={`relative mx-auto ${className}`} aria-hidden>
      <svg viewBox="0 0 120 120" className="w-full h-full">
        {/* warm ground glow */}
        <ellipse cx="60" cy="102" rx="40" ry="12" fill="var(--color-ember)" opacity="0.07" />
        {/* ash mound */}
        <ellipse cx="60" cy="104" rx="34" ry="7" fill="var(--color-iron)" />
        <path d="M32 104 Q60 92 88 104 Z" fill="var(--color-charcoal)" />
        {/* charred logs */}
        <line x1="42" y1="102" x2="72" y2="94" stroke="var(--color-ash)" strokeWidth="4" strokeLinecap="round" />
        <line x1="76" y1="102" x2="48" y2="93" stroke="var(--color-ash)" strokeWidth="4" strokeLinecap="round" />

        {/* the outer flame */}
        <motion.path
          d="M60 97 C46 88 44 68 58 54 C57 63 64 66 63 73 C68 68 66 59 64 52 C77 61 77 84 65 95 Z"
          fill="var(--color-ember)"
          initial={false}
          animate={{ scaleY: [1, 1.1, 0.95, 1], opacity: [0.42, 0.58, 0.46, 0.42] }}
          transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '60px 97px' }}
        />
        {/* the inner tongue */}
        <motion.path
          d="M60 95 C53 88 52 77 59 68 C59 74 63 76 62 80 C65 77 64 71 63 68 C70 75 69 88 63 94 Z"
          fill="var(--color-ember-bright)"
          initial={false}
          animate={{ scaleY: [1, 0.88, 1.14, 1], opacity: [0.75, 0.9, 0.8, 0.75] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '60px 95px' }}
        />

        {/* the rested sword — blade sunk into the mound */}
        <g stroke="var(--color-stone)" strokeLinecap="round">
          <line x1="60" y1="34" x2="60" y2="97" strokeWidth="3" />
          <line x1="51" y1="44" x2="69" y2="44" strokeWidth="3.5" />
        </g>
        <circle cx="60" cy="37" r="3" fill="var(--color-souls-dim)" />
      </svg>

      {/* rising embers */}
      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 bottom-7 h-1 w-1 rounded-full bg-ember-bright"
          style={{ marginLeft: s.x }}
          initial={{ opacity: 0 }}
          animate={{ y: [0, -48], x: [0, s.drift], opacity: [0, 0.9, 0] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
