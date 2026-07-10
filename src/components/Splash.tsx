import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { pick, SPLASH_LINES } from '../ui/flavor'
import { useGame } from '../state/store'

/* ================================================================
   SPLASH — a lone ember flares in the dark, revealing the name
   ================================================================ */
export default function Splash({ onDone }: { onDone: () => void }) {
  const [line] = useState(() => pick(SPLASH_LINES))
  const hollowed = useGame((s) => s.settings.hollowed)
  useEffect(() => {
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      key="splash"
      exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[80] bg-void flex flex-col items-center justify-center"
    >
      <div className="relative flex items-center justify-center">
        {/* the flare halo */}
        <motion.div
          aria-hidden
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 0.6, 3.2], opacity: [0, 0.5, 0.9] }}
          transition={{ duration: 1.8, times: [0, 0.45, 1], ease: 'easeInOut' }}
          className="absolute w-24 h-24 rounded-full blur-sm"
          style={{
            background: hollowed
              ? 'radial-gradient(circle, rgba(109,168,207,0.5), rgba(109,168,207,0.12) 55%, transparent 75%)'
              : 'radial-gradient(circle, rgba(255,117,24,0.5), rgba(255,117,24,0.12) 55%, transparent 75%)',
          }}
        />
        {/* the ember itself */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0.15 }}
          animate={{ scale: [0.4, 0.8, 1.4], opacity: [0.15, 0.8, 1] }}
          transition={{ duration: 1.8, times: [0, 0.45, 1], ease: 'easeInOut' }}
          className="w-3 h-3 rounded-full bg-ember-bright shadow-ember-glow"
        />
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.35, duration: 0.75, ease: 'easeOut' }}
        className="font-display text-souls text-3xl tracking-[0.3em] mt-10"
      >
        EMBERFORGE
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1.7, duration: 0.6 }}
        className="font-body italic text-bone-dim text-sm mt-2"
      >
        {line}
      </motion.p>
    </motion.div>
  )
}
