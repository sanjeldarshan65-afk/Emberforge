import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../state/store'

/* ================================================================
   BONFIRE REST TIMER
   Slides up when a set is completed; an ember ring burns down.
   Re-triggering (another set) re-kindles it to full.
   ================================================================ */

const DEFAULT_MS = 90_000
const R = 44
const CIRC = 2 * Math.PI * R

export default function RestTimer({
  trigger,
  onOpenChange,
}: {
  trigger: number
  onOpenChange?: (open: boolean) => void
}) {
  const restSeconds = useGame((s) => s.settings.restSeconds)
  const vibration = useGame((s) => s.settings.vibration)
  const hollowed = useGame((s) => s.settings.hollowed)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [totalMs, setTotalMs] = useState(DEFAULT_MS)
  const [remainingMs, setRemainingMs] = useState(0)
  const [flash, setFlash] = useState(false)
  const flashTimeout = useRef(0)

  /* a set was completed — kindle (or re-kindle) the rest */
  useEffect(() => {
    if (trigger === 0) return
    const ms = restSeconds * 1000
    setTotalMs(ms)
    setRemainingMs(ms)
    setEndAt(Date.now() + ms)
    // duration is read at kindle-time on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  /* burn down against a real timestamp, so background tabs stay honest */
  useEffect(() => {
    if (endAt === null) return
    const id = window.setInterval(() => {
      const rem = endAt - Date.now()
      if (rem <= 0) {
        setEndAt(null)
        setRemainingMs(0)
        setFlash(true)
        try {
          if (vibration) navigator.vibrate?.(200)
        } catch {
          /* not all vessels can tremble */
        }
        flashTimeout.current = window.setTimeout(() => setFlash(false), 1000)
      } else {
        setRemainingMs(rem)
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [endAt, vibration])

  useEffect(() => () => window.clearTimeout(flashTimeout.current), [])

  const adjust = (deltaMs: number) => {
    setEndAt((e) => (e === null ? e : Math.max(Date.now() + 1000, e + deltaMs)))
    setTotalMs((t) => Math.max(10_000, t + deltaMs))
  }

  const open = endAt !== null
  /* let the battle screen reserve space so this top banner never covers the set controls */
  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])
  const frac = open ? Math.max(0, Math.min(remainingMs / totalMs, 1)) : 0
  const secs = Math.ceil(remainingMs / 1000)
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: -150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -150, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}
            className="fixed top-0 inset-x-0 z-[56] px-4"
          >
            <div className="max-w-sm mx-auto panel panel-ornate p-3 flex items-center gap-4 bg-void/70 backdrop-blur-md">
              {/* the burning ring */}
              <div className="relative w-16 h-16 shrink-0">
                <svg
                  viewBox="0 0 100 100"
                  className="w-16 h-16 -rotate-90 drop-shadow-[0_0_10px_rgba(255,117,24,0.45)]"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="emberRing" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ffa04d" />
                      <stop offset="100%" stopColor="#b34700" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-ash)" strokeWidth="4" />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r={R}
                    fill="none"
                    stroke="url(#emberRing)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    animate={{ strokeDashoffset: CIRC * (1 - frac) }}
                    transition={{ duration: 0.2, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-souls text-sm" role="timer" aria-live="off">
                    {clock}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim mb-2">
                  Rest at the Embers
                </div>
                <div className="flex gap-2">
                  <button onClick={() => adjust(30_000)} className="btn-hollow flex-1 min-h-11 text-[0.6rem]">
                    +30s
                  </button>
                  <button onClick={() => setEndAt(null)} className="btn-hollow flex-1 min-h-11 text-[0.6rem]">
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* screen-EDGE pulse when the rest burns out — gold, or spectral when hollowed */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, times: [0, 0.22, 1], ease: 'easeOut' }}
            className="fixed inset-0 z-[75] pointer-events-none"
            style={{
              boxShadow: hollowed
                ? 'inset 0 0 60px 10px rgba(109,168,207,0.55), inset 0 0 150px 46px rgba(109,168,207,0.22)'
                : 'inset 0 0 60px 10px rgba(230,195,92,0.6), inset 0 0 150px 46px rgba(230,195,92,0.25)',
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
