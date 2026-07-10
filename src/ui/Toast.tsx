import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToastCtx } from './toastContext'
import type { ToastKind, PushToast } from './toastContext'

/* ================================================================
   ITEM-DROP TOASTS — "+ 150 Souls Gained"
   ================================================================ */

type Toast = { id: number; text: string; kind: ToastKind }

const TOAST_MS = 3000
let seq = 0

const KIND_CLS: Record<ToastKind, string> = {
  souls: 'border-l-souls shadow-souls-glow text-souls',
  ember: 'border-l-ember shadow-ember-glow text-glow-ember',
  blood: 'border-l-blood-bright text-blood-bright',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback<PushToast>((text, kind = 'souls') => {
    const id = ++seq
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), TOAST_MS)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}

      {/* the drop zone — slides in from the top, stacks, fades away */}
      <div
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        className="fixed top-0 inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, transition: { duration: 0.35 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={`panel border-l-2 px-4 py-2.5 max-w-sm w-full sm:w-auto ${KIND_CLS[t.kind]}`}
            >
              <span className="font-display text-[0.7rem] tracking-[0.18em] uppercase">
                {t.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
