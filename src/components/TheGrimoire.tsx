import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, MOVEMENTS } from '../state/store'
import type { Movement, Routine } from '../state/store'
import ExercisePicker from './ExercisePicker'

/* ================================================================
   THE GRIMOIRE — saved battle plans (routines)
   ================================================================ */

export default function TheGrimoire({
  open,
  onClose,
  onSelect,
  startCreating = false,
}: {
  open: boolean
  onClose: () => void
  onSelect: (r: Routine) => void
  startCreating?: boolean
}) {
  const routines = useGame((s) => s.routines)
  const saveRoutine = useGame((s) => s.saveRoutine)
  const updateRoutine = useGame((s) => s.updateRoutine)
  const deleteRoutine = useGame((s) => s.deleteRoutine)

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (open) {
      setCreating(startCreating)
      setEditingId(null)
    }
  }, [open, startCreating])

  const beginEdit = (r: Routine) => {
    setName(r.name)
    setSeq(r.movements)
    setEditingId(r.id)
    setCreating(true)
  }
  const [name, setName] = useState('')
  const [seq, setSeq] = useState<Movement[]>([])

  const sealSpell = () => {
    if (!name.trim() || seq.length === 0) return
    if (editingId) updateRoutine(editingId, name.trim(), seq)
    else saveRoutine(name.trim(), seq)
    setName('')
    setSeq([])
    setEditingId(null)
    setCreating(false)
  }

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
            className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto border-t border-souls-dim/50 bg-void/80 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),1rem)]"
          >
            <div className="max-w-2xl mx-auto px-5 pt-5">
              <div className="divider-ornate mb-4">The Grimoire</div>

              {/* ---- inscribed spells ---- */}
              {routines.length === 0 && !creating && (
                <p className="text-bone-dim italic text-center text-sm mb-4">
                  The grimoire lies empty. Inscribe thy first battle plan.
                </p>
              )}

              <div className="space-y-2 mb-4">
                {routines.map((r) => (
                  <div key={r.id} className="panel panel-ornate p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-bone tracking-wider truncate">{r.name}</div>
                      <div className="font-ui text-xs text-faded truncate">
                        {r.movements.join(' · ')}
                      </div>
                    </div>
                    <button
                      onClick={() => onSelect(r)}
                      className="btn-ember min-h-11 px-4 shrink-0 text-[0.6rem]"
                    >
                      Wield
                    </button>
                    <button
                      onClick={() => beginEdit(r)}
                      aria-label={`edit ${r.name}`}
                      className="min-h-11 min-w-9 shrink-0 text-faded hover:text-souls transition-colors"
                    >
                      &#9998;
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Burn "${r.name}" from the grimoire?`)) deleteRoutine(r.id)
                      }}
                      aria-label={`delete ${r.name}`}
                      className="min-h-11 min-w-9 shrink-0 text-faded hover:text-blood-bright transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              {/* ---- inscribe a new spell ---- */}
              {creating ? (
                <div className="panel p-4 space-y-3">
                  <input
                    type="text"
                    maxLength={32}
                    placeholder="Name the spell — e.g. The Push Vanguard"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-dark min-h-12"
                    aria-label="routine name"
                  />

                  <p className="font-ui text-xs text-faded">tap movements in the order of battle:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MOVEMENTS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setSeq((s) => [...s, m])}
                        className="min-h-11 px-2 font-display text-[0.65rem] tracking-[0.12em] uppercase border border-ash text-bone-dim bg-charcoal active:bg-iron transition-colors"
                      >
                        + {m}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowPicker(true)}
                      className="min-h-11 px-2 font-display text-[0.65rem] tracking-[0.12em] uppercase border border-dashed border-stone text-bone-dim bg-charcoal/60 active:bg-iron transition-colors"
                    >
                      &#8943; all rites
                    </button>
                  </div>

                  {seq.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {seq.map((m, i) => (
                        <button
                          key={`${m}-${i}`}
                          onClick={() => setSeq((s) => s.filter((_, j) => j !== i))}
                          className="px-2.5 py-1.5 border border-souls-dim text-souls font-ui text-xs"
                          aria-label={`remove ${m} from sequence`}
                        >
                          {i + 1}. {m} &times;
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={sealSpell}
                      disabled={!name.trim() || seq.length === 0}
                      className="btn-ember flex-1 min-h-12"
                    >
                      {editingId ? 'Amend the Spell' : 'Seal the Spell'}
                    </button>
                    <button
                      onClick={() => {
                        setCreating(false)
                        setName('')
                        setSeq([])
                        setEditingId(null)
                      }}
                      className="btn-hollow flex-1 min-h-12"
                    >
                      Abandon
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setCreating(true)} className="btn-hollow w-full min-h-12">
                  ✎ Inscribe a New Spell
                </button>
              )}

              <button onClick={onClose} className="w-full min-h-10 mt-3 mb-1 font-ui text-xs text-faded hover:text-bone-dim transition-colors">
                close the grimoire
              </button>

              <ExercisePicker
                open={showPicker}
                onClose={() => setShowPicker(false)}
                onPick={(m) => {
                  setSeq((s) => [...s, m])
                  setShowPicker(false)
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
