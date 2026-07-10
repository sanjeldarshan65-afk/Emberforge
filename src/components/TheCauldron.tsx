import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MealItem, SavedMeal } from '../state/store'
import { estimateMealFromPhoto, getVisionKey, setVisionKey } from '../ai/vision'
import { useToast } from '../ui/toastContext'
import { useModalDismiss } from '../ui/useModalDismiss'

/* ================================================================
   THE CAULDRON — brew and preserve custom meals.
   Add rites from the codex (with quantities) or pour in raw macros
   by hand; a photo may be appraised by an optional vision key. Seal
   the recipe and it lives in the ledger, logged in a single tap.
   ================================================================ */

type FoodLite = {
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
  chicken: boolean
  mayo: boolean
}

const EMPTY_MANUAL = { name: '', calories: '', protein: '', carbs: '', fats: '' }

export default function TheCauldron({
  open,
  onClose,
  foods,
  strict,
  editing,
  onSave,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  foods: FoodLite[]
  strict: boolean
  editing: SavedMeal | null
  onSave: (meal: Omit<SavedMeal, 'id'>) => void
  onUpdate: (id: string, meal: Omit<SavedMeal, 'id'>) => void
}) {
  useModalDismiss(open, onClose)
  const toast = useToast()
  const [name, setName] = useState('')
  const [items, setItems] = useState<MealItem[]>([])
  const [query, setQuery] = useState('')
  const [manual, setManual] = useState(EMPTY_MANUAL)
  const [appraising, setAppraising] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  /* seed from the meal being edited (or a clean cauldron) each time it opens */
  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setItems(editing ? editing.items.map((i) => ({ ...i })) : [])
    setQuery('')
    setManual(EMPTY_MANUAL)
  }, [open, editing])

  /* the Strict Covenant governs the codex picker; manual entries bypass it */
  const pickable = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = strict ? foods.filter((f) => f.chicken && !f.mayo) : foods
    return base.filter((f) => f.name.toLowerCase().includes(q))
  }, [foods, strict, query])

  const totals = useMemo(
    () =>
      items.reduce(
        (t, i) => ({
          calories: t.calories + i.calories * i.qty,
          protein: t.protein + i.protein * i.qty,
          carbs: t.carbs + i.carbs * i.qty,
          fats: t.fats + i.fats * i.qty,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      ),
    [items]
  )

  const round = (n: number) => Math.round(n)

  const addFood = (f: FoodLite) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.name === f.name)
      if (i >= 0) {
        const next = [...prev]
        next[i] = { ...next[i], qty: next[i].qty + 1 }
        return next
      }
      return [
        ...prev,
        { name: f.name, qty: 1, calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats },
      ]
    })
  }

  const changeQty = (idx: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it, i) => (i === idx ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0)
    )
  }

  const addManual = () => {
    const nm = manual.name.trim()
    const cal = Number(manual.calories) || 0
    if (!nm || cal <= 0) {
      toast('Name the dish and give it calories', 'blood')
      return
    }
    setItems((prev) => [
      ...prev,
      {
        name: nm,
        qty: 1,
        calories: cal,
        protein: Number(manual.protein) || 0,
        carbs: Number(manual.carbs) || 0,
        fats: Number(manual.fats) || 0,
      },
    ])
    setManual(EMPTY_MANUAL)
  }

  const onPhoto = async (file: File) => {
    setAppraising(true)
    try {
      const est = await estimateMealFromPhoto(file)
      if (est) {
        setManual({
          name: est.name,
          calories: String(est.calories),
          protein: String(est.protein),
          carbs: String(est.carbs),
          fats: String(est.fats),
        })
        toast('The feast is appraised — confirm & add', 'ember')
      } else {
        toast('No appraiser set — pour the macros by hand', 'souls')
      }
    } catch {
      toast('The appraisal failed — enter by hand', 'blood')
    } finally {
      setAppraising(false)
    }
  }

  const seal = () => {
    const nm = name.trim()
    if (!nm) {
      toast('Thy recipe needs a name', 'blood')
      return
    }
    if (items.length === 0) {
      toast('An empty cauldron yields nothing', 'blood')
      return
    }
    const payload: Omit<SavedMeal, 'id'> = {
      name: nm,
      items,
      calories: round(totals.calories),
      protein: round(totals.protein),
      carbs: round(totals.carbs),
      fats: round(totals.fats),
    }
    if (editing) onUpdate(editing.id, payload)
    else onSave(payload)
    toast(editing ? 'The recipe is re-forged' : 'The recipe is sealed', 'souls')
    onClose()
  }

  const saveKey = () => {
    if (!keyInput.trim()) return
    setVisionKey(keyInput)
    setKeyInput('')
    toast('Appraiser attuned to this device', 'ember')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[64] bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="The Cauldron"
            className="absolute bottom-0 inset-x-0 max-h-[90vh] overflow-y-auto border-t border-souls-dim/50 bg-void/85 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),1.25rem)]"
          >
            <div className="max-w-2xl mx-auto px-5 pt-5">
              <div className="divider-ornate mb-4">{editing ? 'Re-forge the Recipe' : 'The Cauldron'}</div>

              {/* meal name */}
              <input
                type="text"
                maxLength={40}
                placeholder="Name thy brew — e.g. Ashen Warrior's Repast"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-dark min-h-12 font-display tracking-wider"
                aria-label="meal name"
              />

              {/* running totals */}
              <div className="panel panel-ornate mt-4 p-4 flex items-center justify-between">
                <div>
                  <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">
                    The Brew Yields
                  </div>
                  <div className="stat-souls text-2xl leading-none mt-1">
                    {round(totals.calories).toLocaleString()}
                    <span className="text-sm text-souls-dim ml-1">kcal</span>
                  </div>
                </div>
                <div className="font-ui text-xs text-bone-dim text-right leading-relaxed">
                  <div>P {round(totals.protein)}g</div>
                  <div>C {round(totals.carbs)}g</div>
                  <div>F {round(totals.fats)}g</div>
                </div>
              </div>

              {/* components in the pot */}
              {items.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {items.map((it, idx) => (
                    <div key={`${it.name}-${idx}`} className="flex items-center gap-2 px-3 py-2 bg-charcoal border border-ash">
                      <div className="flex-1 min-w-0">
                        <div className="text-bone text-sm truncate">{it.name}</div>
                        <div className="font-ui text-[0.65rem] text-faded">
                          {it.calories} kcal · P{it.protein} C{it.carbs} F{it.fats} each
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => changeQty(idx, -1)}
                          aria-label="one fewer"
                          className="min-h-9 min-w-9 border border-ash text-bone-dim active:border-ember"
                        >
                          &minus;
                        </button>
                        <span className="font-display text-souls w-6 text-center">{it.qty}</span>
                        <button
                          onClick={() => changeQty(idx, 1)}
                          aria-label="one more"
                          className="min-h-9 min-w-9 border border-ash text-bone-dim active:border-ember"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* add from the codex */}
              <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim mt-6 mb-2">
                Add from the Codex {strict && <span className="text-glow-ember">· Covenant bound</span>}
              </div>
              <input
                type="search"
                placeholder="Search the codex..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-dark min-h-11"
                aria-label="search codex for meal"
              />
              <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                {pickable.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => addFood(f)}
                    className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 border border-ash hover:border-souls-dim transition-colors"
                  >
                    <span className="text-bone-dim text-sm truncate">{f.name}</span>
                    <span className="font-ui text-[0.65rem] text-faded shrink-0">{f.calories} kcal · P{f.protein}</span>
                  </button>
                ))}
                {pickable.length === 0 && (
                  <p className="text-faded italic text-xs px-1 py-2">No matching rite in the codex.</p>
                )}
              </div>

              {/* manual entry + photo appraisal */}
              <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim mt-6 mb-2">
                Pour in by Hand
              </div>
              <div className="panel p-3 space-y-2">
                <input
                  type="text"
                  placeholder="Dish name"
                  value={manual.name}
                  onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                  className="input-dark min-h-11"
                  aria-label="manual dish name"
                />
                <div className="grid grid-cols-4 gap-2">
                  {(['calories', 'protein', 'carbs', 'fats'] as const).map((k) => (
                    <div key={k}>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={k === 'calories' ? 'kcal' : k[0].toUpperCase()}
                        value={manual[k]}
                        onChange={(e) => setManual((m) => ({ ...m, [k]: e.target.value }))}
                        className="input-dark min-h-11 text-center"
                        aria-label={`manual ${k}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addManual} className="btn-hollow flex-1 min-h-11 text-[0.6rem]">
                    Add to Pot
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={appraising}
                    className="btn-hollow min-h-11 px-4 text-[0.6rem] disabled:opacity-50"
                  >
                    {appraising ? 'Appraising…' : '☖ Snap a Photo'}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void onPhoto(f)
                      e.target.value = ''
                    }}
                  />
                </div>
                {!getVisionKey() && (
                  <div className="pt-1">
                    <p className="font-ui text-[0.6rem] text-faded mb-1">
                      Photo appraisal needs a personal vision key (stored on this device only). Without it, enter macros by hand.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="OpenAI vision key (optional)"
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        className="input-dark min-h-10 text-xs"
                        aria-label="vision api key"
                      />
                      <button onClick={saveKey} className="btn-hollow min-h-10 px-3 text-[0.55rem] shrink-0">
                        Attune
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* seal */}
              <button onClick={seal} className="btn-ember w-full min-h-12 mt-6">
                {editing ? 'Re-forge the Recipe' : 'Seal the Recipe'}
              </button>
              <button onClick={onClose} className="btn-hollow w-full min-h-11 mt-2 mb-2 text-[0.6rem]">
                Abandon the Brew
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
