import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, todayKey } from '../state/store'
import type { Macros, SavedMeal } from '../state/store'
import {
  sumConsumed,
  remainingOf,
  remainingAll,
  overageOf,
  flaskPctOf,
  macroConsistencyViolations,
} from '../state/nutrition'
import { useToast } from '../ui/toastContext'
import TheCauldron from './TheCauldron'

/* ================================================================
   MEAL CODEX — per-serving macros
   ================================================================ */
type Food = Macros & {
  name: string
  desc: string
  chicken: boolean
  mayo: boolean
}

const FOODS: Food[] = [
  { name: 'Grilled Chicken Breast', desc: 'Plain. Dry. Eternal.', chicken: true, mayo: false, calories: 280, protein: 54, carbs: 0, fats: 6 },
  { name: 'Chicken & Jasmine Rice', desc: 'The staple of the covenant.', chicken: true, mayo: false, calories: 540, protein: 48, carbs: 58, fats: 12 },
  { name: 'Chicken & Sweet Potato', desc: 'Fuel for the long climb.', chicken: true, mayo: false, calories: 450, protein: 46, carbs: 42, fats: 10 },
  { name: 'Rotisserie Chicken Quarter', desc: 'Torn from the spit, still warm.', chicken: true, mayo: false, calories: 320, protein: 38, carbs: 0, fats: 18 },
  { name: 'Chicken Caesar Wrap', desc: 'The dressing hides a pale heresy.', chicken: true, mayo: true, calories: 530, protein: 38, carbs: 44, fats: 22 },
  { name: 'Chicken Salad Croissant', desc: 'Bound together by forbidden cream.', chicken: true, mayo: true, calories: 540, protein: 28, carbs: 38, fats: 30 },
  { name: 'Ribeye & Potatoes', desc: 'A feast for after the boss falls.', chicken: false, mayo: false, calories: 690, protein: 52, carbs: 35, fats: 38 },
  { name: 'Salmon & Asparagus', desc: 'Pulled from the Ashen Lake.', chicken: false, mayo: false, calories: 400, protein: 42, carbs: 8, fats: 22 },
  { name: 'Ground Beef Bowl', desc: 'Simple fare for a simple hollow.', chicken: false, mayo: false, calories: 590, protein: 44, carbs: 48, fats: 24 },
  { name: 'Eggs & Oats', desc: 'The breakfast of the Unkindled.', chicken: false, mayo: false, calories: 480, protein: 28, carbs: 52, fats: 18 },
  { name: 'Greek Yogurt & Berries', desc: 'A cool mercy between battles.', chicken: false, mayo: false, calories: 260, protein: 24, carbs: 32, fats: 4 },
  { name: 'Whey of the Firstborn', desc: 'A shake. Restores 30 protein.', chicken: false, mayo: false, calories: 170, protein: 30, carbs: 6, fats: 3 },
  { name: 'Tuna Salad Sandwich', desc: 'Drowned in the white substance.', chicken: false, mayo: true, calories: 500, protein: 32, carbs: 40, fats: 24 },
  { name: 'Turkey Club', desc: 'Slathered in heresy between three breads.', chicken: false, mayo: true, calories: 560, protein: 36, carbs: 46, fats: 26 },
  { name: 'Potato Salad', desc: 'More heresy than potato.', chicken: false, mayo: true, calories: 350, protein: 6, carbs: 34, fats: 22 },
]

/* ================================================================
   ESTUS FLASK — fills as calories are logged
   ================================================================ */
const FLASK_PATH =
  'M42 9 L58 9 L58 34 C74 42 83 58 83 78 C83 106 68 124 50 124 C32 124 17 106 17 78 C17 58 26 42 42 34 Z'

function EstusFlask({ pct }: { pct: number }) {
  const hollowed = useGame((s) => s.settings.hollowed)
  const clamped = Math.max(0, Math.min(pct, 100))
  /* liquid surface: y=124 at empty, y=30 at full */
  const y = 124 - (clamped / 100) * 94
  return (
    <svg
      viewBox="0 0 100 132"
      className={`w-24 shrink-0 ${
        hollowed
          ? 'drop-shadow-[0_0_14px_rgba(109,168,207,0.35)]'
          : 'drop-shadow-[0_0_14px_rgba(255,117,24,0.35)]'
      }`}
      role="img"
      aria-label={`Estus flask ${clamped.toFixed(0)} percent full`}
    >
      <defs>
        <linearGradient id="estusFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hollowed ? '#a6cfe6' : '#ffb347'} />
          <stop offset="55%" stopColor={hollowed ? '#6da8cf' : '#ff7518'} />
          <stop offset="100%" stopColor={hollowed ? '#35576f' : '#b34700'} />
        </linearGradient>
        <clipPath id="flaskClip">
          <path d={FLASK_PATH} />
        </clipPath>
      </defs>

      {/* glass */}
      <path
        d={FLASK_PATH}
        fill="rgba(255,179,71,0.05)"
        stroke="var(--color-souls-dim)"
        strokeWidth="2"
      />

      {/* liquid */}
      <g clipPath="url(#flaskClip)" className="animate-flicker">
        <motion.rect
          x="0"
          width="100"
          height="132"
          initial={false}
          animate={{ y }}
          transition={{ type: 'spring', stiffness: 55, damping: 16 }}
          fill="url(#estusFill)"
        />
      </g>

      {/* cork */}
      <rect x="40" y="2" width="20" height="7" fill="var(--color-stone)" />
    </svg>
  )
}

/* ================================================================
   MACRO BAR
   ================================================================ */
function MacroBar({
  label,
  used,
  goal,
  barClass,
}: {
  label: string
  used: number
  goal: number
  barClass: string
}) {
  const pct = Math.min((used / goal) * 100, 100)
  const left = remainingOf(goal, used)
  const over = overageOf(goal, used)
  return (
    <div>
      <div className="flex justify-between font-ui text-xs mb-1">
        <span className="text-bone-dim">{label}</span>
        <span className={left === 0 ? 'text-glow-ember' : 'text-faded'}>
          {left === 0
            ? over > 0
              ? `goal met · +${over.toFixed(0)}g over`
              : 'goal met'
            : `${left.toFixed(0)}g remain`}
        </span>
      </div>
      <div className="h-1.5 bg-abyss border border-ash overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full ${barClass}`}
        />
      </div>
    </div>
  )
}

/* ================================================================
   RATIONS TRACKER
   ================================================================ */
export default function RationsTracker() {
  const macroGoals = useGame((s) => s.macroGoals)
  const rations = useGame((s) => s.rations)
  const logRation = useGame((s) => s.logRation)
  const removeRation = useGame((s) => s.removeRation)
  const savedMeals = useGame((s) => s.savedMeals)
  const saveMeal = useGame((s) => s.saveMeal)
  const updateMeal = useGame((s) => s.updateMeal)
  const deleteMeal = useGame((s) => s.deleteMeal)

  const toast = useToast()
  const [query, setQuery] = useState('')
  const [strict, setStrict] = useState(false)
  const [cauldronOpen, setCauldronOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<SavedMeal | null>(null)

  const today = useMemo(() => rations.filter((r) => r.date === todayKey()), [rations])

  /* all arithmetic lives in state/nutrition.ts — one source of truth,
     unit-tested in tests/nutrition.test.ts */
  const consumed = useMemo(() => sumConsumed(rations, todayKey()), [rations])

  const kcalLeft = remainingOf(macroGoals.calories, consumed.calories)
  const flaskPct = flaskPctOf(macroGoals.calories, consumed.calories)

  /* dev-mode invariant: after every add/remove, what the panel shows
     must equal goal − sum(today's log) for all four macros */
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const violations = macroConsistencyViolations(macroGoals, rations, todayKey(), {
      consumed,
      remaining: { ...remainingAll(macroGoals, consumed), calories: kcalLeft },
    })
    if (violations.length)
      console.error('[Estus Rations] macro consistency broken:\n' + violations.join('\n'))
  }, [rations, macroGoals, consumed, kcalLeft])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = FOODS.filter((f) => f.name.toLowerCase().includes(q))
    if (strict) {
      // The Strict Covenant — a true dietary constraint, not a mere re-sort:
      //  • mayonnaise is banished outright, even when the ashen one searches for it
      //  • only the chicken may pass (chicken-exclusive)
      //  • richest protein rises first
      list = list
        .filter((f) => f.chicken && !f.mayo)
        .sort((a, b) => b.protein - a.protein)
    }
    return list
  }, [query, strict])

  const consume = (f: Food) => {
    logRation(f.name, {
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fats: f.fats,
    })
    toast(`+ ${f.name}`, 'souls')
    if (consumed.protein < macroGoals.protein && consumed.protein + f.protein >= macroGoals.protein)
      toast('Protein covenant fulfilled', 'ember')
    if (consumed.calories < macroGoals.calories && consumed.calories + f.calories >= macroGoals.calories)
      toast('Estus Flask filled', 'ember')
  }

  /* logging a saved meal fills the flask & bars exactly like a single item */
  const consumeMeal = (m: SavedMeal) => {
    logRation(m.name, { calories: m.calories, protein: m.protein, carbs: m.carbs, fats: m.fats })
    toast(`+ ${m.name}`, 'souls')
    if (consumed.protein < macroGoals.protein && consumed.protein + m.protein >= macroGoals.protein)
      toast('Protein covenant fulfilled', 'ember')
    if (consumed.calories < macroGoals.calories && consumed.calories + m.calories >= macroGoals.calories)
      toast('Estus Flask filled', 'ember')
  }

  const openCauldron = (meal: SavedMeal | null) => {
    setEditingMeal(meal)
    setCauldronOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="divider-ornate">Estus Rations</div>

      {/* ============ FLASK + MACROS ============ */}
      <div className="panel panel-ornate p-5">
        <div className="flex items-center gap-5">
          <EstusFlask pct={flaskPct} />
          <div className="flex-1 space-y-3">
            <div>
              <div className="font-display text-[0.65rem] tracking-[0.25em] uppercase text-souls-dim">
                Estus Remaining
              </div>
              <div className="stat-souls text-3xl leading-tight">
                {kcalLeft.toLocaleString()}
                <span className="text-sm text-souls-dim ml-1">kcal</span>
              </div>
              <div className="font-ui text-xs text-faded">
                {consumed.calories.toLocaleString()} / {macroGoals.calories.toLocaleString()} drunk this day
              </div>
            </div>
            <MacroBar label="Protein" used={consumed.protein} goal={macroGoals.protein} barClass="bg-gradient-to-r from-ember-deep to-ember" />
            <MacroBar label="Carbs" used={consumed.carbs} goal={macroGoals.carbs} barClass="bg-gradient-to-r from-souls-dim to-souls" />
            <MacroBar label="Fats" used={consumed.fats} goal={macroGoals.fats} barClass="bg-gradient-to-r from-stone to-humanity" />
          </div>
        </div>
      </div>

      {/* ============ STRICT COVENANT + SEARCH ============ */}
      <div className="flex items-center justify-between gap-4">
        <button
          role="switch"
          aria-checked={strict}
          onClick={() => setStrict((v) => !v)}
          className="flex items-center gap-3 min-h-12"
        >
          <span
            className={`relative inline-block w-12 h-7 border transition-colors duration-300 ${
              strict ? 'border-ember bg-ember-deep/40 shadow-ember-glow' : 'border-ash bg-abyss'
            }`}
          >
            <motion.span
              initial={false}
              animate={{ x: strict ? 25 : 3 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`absolute top-[5px] h-4 w-4 ${strict ? 'bg-ember' : 'bg-stone'}`}
            />
          </span>
          <span
            className={`font-display text-[0.65rem] tracking-[0.2em] uppercase transition-colors ${
              strict ? 'text-glow-ember' : 'text-bone-dim'
            }`}
          >
            Strict Covenant
          </span>
        </button>
      </div>

      <AnimatePresence>
        {strict && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-faded italic text-sm overflow-hidden"
          >
            The covenant is sworn. Mayonnaise is banished outright — even from thy searches —
            and only the chicken may pass, its richest protein rising first.
          </motion.p>
        )}
      </AnimatePresence>

      {/* ============ THE CAULDRON · saved recipes ============ */}
      <div className="flex items-center gap-3">
        <div className="divider-ornate flex-1">Thy Recipes</div>
        <button
          onClick={() => openCauldron(null)}
          className="btn-hollow min-h-10 px-4 text-[0.6rem] shrink-0"
        >
          &#9879; Brew a Meal
        </button>
      </div>

      {savedMeals.length === 0 ? (
        <p className="text-faded italic text-sm">
          The cauldron sits cold. Brew a meal, and thereafter log it in a single tap.
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {savedMeals.map((m) => (
              <motion.div
                layout
                key={m.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="panel panel-ornate p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-display text-bone text-sm tracking-wider truncate">{m.name}</div>
                  <div className="font-ui text-xs text-bone-dim mt-1">
                    {m.calories} kcal &middot; P {m.protein} &middot; C {m.carbs} &middot; F {m.fats}
                  </div>
                  <div className="font-ui text-[0.65rem] text-faded italic truncate mt-0.5">
                    {m.items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(', ')}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0 w-24">
                  <button onClick={() => consumeMeal(m)} className="btn-hollow min-h-10 text-[0.6rem]">
                    Consume
                  </button>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openCauldron(m)}
                      aria-label={`edit ${m.name}`}
                      className="min-h-9 flex-1 border border-ash text-bone-dim text-[0.6rem] hover:border-souls-dim transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMeal(m.id)}
                      aria-label={`delete ${m.name}`}
                      className="min-h-9 flex-1 border border-ash text-faded text-[0.6rem] hover:border-blood-bright hover:text-blood-bright transition-colors"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <input
        type="search"
        placeholder="Search the meal codex..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input-dark min-h-12"
        aria-label="search meals"
      />

      {/* ============ MEAL CODEX ============ */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((f) => (
            <motion.div
              layout
              key={f.name}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="panel p-4 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-display text-bone text-sm tracking-wider truncate">
                  {f.name}
                  {strict && f.chicken && (
                    <span className="ml-2 text-[0.55rem] font-bold tracking-[0.2em] text-souls align-middle">
                      &#10022; COVENANT
                    </span>
                  )}
                </div>
                <div className="font-ui text-xs text-faded italic truncate">{f.desc}</div>
                <div className="font-ui text-xs text-bone-dim mt-1">
                  {f.calories} kcal &middot; P {f.protein} &middot; C {f.carbs} &middot; F {f.fats}
                </div>
              </div>
              <button
                onClick={() => consume(f)}
                className="btn-hollow min-h-12 px-4 shrink-0 text-[0.6rem]"
              >
                Consume
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {visible.length === 0 && (
          <div className="panel p-6 text-center">
            <p className="text-bone-dim italic">No such ration exists in the codex.</p>
          </div>
        )}
      </div>

      {/* ============ TODAY'S LOG ============ */}
      {today.length > 0 && (
        <section>
          <div className="divider-ornate mb-3">Consumed This Day</div>
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {today.map((r) => (
                <motion.div
                  layout
                  key={r.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
                  className="flex items-center gap-3 px-3 py-2 bg-charcoal border border-ash"
                >
                  <span className="flex-1 text-sm text-bone-dim truncate">{r.name}</span>
                  <span className="font-ui text-xs text-faded shrink-0">
                    {r.calories} kcal &middot; P {r.protein}
                  </span>
                  <button
                    onClick={() => removeRation(r.id)}
                    aria-label={`remove ${r.name}`}
                    className="min-h-10 min-w-10 shrink-0 text-faded hover:text-blood-bright transition-colors"
                  >
                    &times;
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      <TheCauldron
        open={cauldronOpen}
        onClose={() => setCauldronOpen(false)}
        foods={FOODS}
        strict={strict}
        editing={editingMeal}
        onSave={saveMeal}
        onUpdate={updateMeal}
      />
    </div>
  )
}
