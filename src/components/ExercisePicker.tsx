import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EXERCISES, CATEGORIES } from '../state/exercises'
import type { Category } from '../state/exercises'
import { useModalDismiss } from '../ui/useModalDismiss'

/* ================================================================
   EXERCISE PICKER — choose any rite from the catalog
   ================================================================ */

export default function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (name: string) => void
}) {
  useModalDismiss(open, onClose)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<'All' | Category>('All')

  useEffect(() => {
    if (open) {
      setQuery('')
      setCat('All')
    }
  }, [open])

  const visible = useMemo(
    () =>
      EXERCISES.filter(
        (e) =>
          (cat === 'All' || e.category === cat) &&
          e.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [query, cat]
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[63] bg-black/60"
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
            aria-label="Choose an Exercise"
            className="absolute bottom-0 inset-x-0 max-h-[80vh] overflow-y-auto border-t border-souls-dim/50 bg-void/85 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),1rem)]"
          >
            <div className="max-w-2xl mx-auto px-5 pt-5">
              <div className="divider-ornate mb-4">Choose Thy Rite</div>

              <input
                type="search"
                autoFocus
                placeholder="Search the catalog..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-dark min-h-12 mb-3"
                aria-label="search exercises"
              />

              <div className="flex gap-1.5 flex-wrap mb-3">
                {(['All', ...CATEGORIES] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`min-h-9 px-3 font-display text-[0.6rem] tracking-[0.15em] uppercase border transition-colors ${
                      cat === c ? 'border-souls-dim text-souls bg-iron' : 'border-ash text-bone-dim'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <p className="font-ui text-[0.58rem] text-faded mb-3">
                Each rite shows the heatmap regions it kindles — <span className="text-ember">bright</span> is
                primary, faded assists.
              </p>

              <div className="space-y-1.5 mb-4">
                {visible.map((e) => (
                  <button
                    key={e.name}
                    onClick={() => onPick(e.name)}
                    className="panel w-full p-3.5 flex items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="font-display text-bone text-sm tracking-wider truncate">
                        {e.name}
                        {e.compound && (
                          <span className="ml-2 text-[0.55rem] tracking-[0.2em] text-souls-dim align-middle">
                            &#9670; COMPOUND
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="font-ui text-[0.6rem] text-faded">{e.category}</span>
                        {e.heat.primary.map((g) => (
                          <span
                            key={`p-${g}`}
                            className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-ember/50 text-ember"
                          >
                            {g}
                          </span>
                        ))}
                        {e.heat.secondary.map((g) => (
                          <span
                            key={`s-${g}`}
                            className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-ash text-faded"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-souls shrink-0">&rsaquo;</span>
                  </button>
                ))}
                {visible.length === 0 && (
                  <p className="text-bone-dim italic text-center py-4">No such rite is known.</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
