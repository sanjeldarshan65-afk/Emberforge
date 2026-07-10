import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../state/store'
import type { Macros } from '../state/store'
import { forgePlan } from '../state/ritual'
import type { Goal, Experience, RitePlan } from '../state/ritual'
import { useToast } from '../ui/toastContext'

/* ================================================================
   THE RITE OF EMBERS — onboarding quiz that forges a covenant
   Five questions in; macros, rest, taper goal, and a full set
   of Grimoire battle plans out.
   ================================================================ */

const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: 'strength', label: 'Forge Raw Strength', desc: 'Heavier iron, mightier records. The path of the knight.' },
  { id: 'taper', label: 'Sculpt the Golden Taper', desc: 'Broad shoulders, carved waist — the silhouette of legend.' },
  { id: 'cut', label: 'Burn Away the Ash', desc: 'Shed the excess. Keep the muscle. Reveal what was forged.' },
  { id: 'bulk', label: 'Grow Mighty', desc: 'More mass, more meals, more iron. Become the colossus.' },
]

const EXPERIENCES: { id: Experience; label: string; desc: string }[] = [
  { id: 'unkindled', label: 'Unkindled', desc: 'New to the iron, or returning after long ash. (0–1 years)' },
  { id: 'kindled', label: 'Kindled', desc: 'The movements are known; the fire is lit. (1–3 years)' },
  { id: 'cinder', label: 'Lord of Cinder', desc: 'Years beneath the bar. Thou needest structure, not teaching.' },
]

const VESSELS: { bf: number; label: string; desc: string }[] = [
  { bf: 12, label: 'Lean Blade', desc: 'edges and veins show plainly (~12%)' },
  { bf: 18, label: 'Balanced Vessel', desc: 'solid, with some softness (~18%)' },
  { bf: 25, label: 'Stout Keep', desc: 'strong beneath the padding (~25%)' },
  { bf: 32, label: 'Great Bulwark', desc: 'much to burn, much to build (~32%)' },
]

const DAY_CHOICES = [2, 3, 4, 5] as const

function Card({
  label,
  desc,
  onClick,
}: {
  label: string
  desc: string
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="panel panel-ornate w-full p-4 text-left mb-3"
    >
      <div className="font-display text-souls text-sm tracking-[0.12em] uppercase mb-1">{label}</div>
      <p className="font-ui text-xs text-bone-dim">{desc}</p>
    </motion.button>
  )
}

const STEP_TITLES = [
  'Speak of thy vessel',
  'What form does it hold?',
  'What dost thou seek?',
  'How long hast thou fought?',
  'How often wilt thou battle?',
  'The covenant is forged',
]

export default function RiteOfEmbers({ onDone }: { onDone: () => void }) {
  const updateSettings = useGame((s) => s.updateSettings)
  const setVital = useGame((s) => s.setVital)
  const setMacroGoal = useGame((s) => s.setMacroGoal)
  const saveRoutine = useGame((s) => s.saveRoutine)
  const anointTitle = useGame((s) => s.anointTitle)
  const logWeight = useGame((s) => s.logWeight)
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [units, setUnits] = useState<'lb' | 'kg'>('lb')
  const [weight, setWeight] = useState('')
  const [weightError, setWeightError] = useState('')
  const [bodyFat, setBodyFat] = useState(18)
  const [goal, setGoal] = useState<Goal>('taper')
  const [experience, setExperience] = useState<Experience>('unkindled')
  const [plan, setPlan] = useState<RitePlan | null>(null)

  const finish = (days: 2 | 3 | 4 | 5) => {
    setPlan(
      forgePlan({ units, bodyweight: Number(weight), bodyFat, goal, experience, days })
    )
    setStep(5)
  }

  const accept = () => {
    if (!plan) return
    updateSettings({
      units,
      barWeight: units === 'kg' ? 20 : 45,
      taperGoal: plan.taperGoal,
      restSeconds: plan.restSeconds,
    })
    setVital('bodyweight', Number(weight))
    logWeight(Number(weight))
    setVital('bodyFat', bodyFat)
    ;(Object.entries(plan.macroGoals) as [keyof Macros, number][]).forEach(([k, v]) =>
      setMacroGoal(k, v)
    )
    plan.routines.forEach((r) => saveRoutine(r.name, r.movements))
    anointTitle(plan.title)
    toast('The covenant is sealed', 'souls')
    toast(`${plan.routines.length} battle plans inscribed`, 'ember')
    onDone()
  }

  const weightValid = Number(weight) > 50 && Number(weight) < 700

  /* required-field guard: advance from step 0 only with a sane weight, else speak up */
  const submitWeight = () => {
    if (!weightValid) {
      setWeightError(
        weight.trim() === ''
          ? 'Speak thy weight — this field is required.'
          : `That weight rings false. Give a number between 50 and 700 ${units}.`
      )
      return
    }
    setWeightError('')
    setStep(1)
  }

  return (
    <motion.div
      key="rite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top))' }}
      className="min-h-screen w-full max-w-lg mx-auto flex flex-col px-5 pb-8"
    >
      <div className="divider-ornate mb-2">The Rite of Embers</div>
      <p className="text-center text-faded italic text-sm mb-5">
        Answer truly, and the flame shall shape thy path.
      </p>

      {/* progress embers */}
      <div className="flex justify-center gap-2 mb-7">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rotate-45 transition-colors duration-300 ${
              i < step ? 'bg-souls' : i === step ? 'bg-ember shadow-ember-glow' : 'bg-ash'
            }`}
          />
        ))}
      </div>

      {step > 0 && step < 5 && (
        <button
          onClick={() => setStep((s) => s - 1)}
          className="self-start mb-3 font-ui text-xs text-faded hover:text-bone-dim transition-colors min-h-8"
        >
          &lsaquo; return
        </button>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-1"
        >
          <h2 className="font-display text-bone text-lg tracking-[0.15em] text-center mb-5">
            {STEP_TITLES[step]}
          </h2>

          {/* ---- step 0: units + bodyweight ---- */}
          {step === 0 && (
            <div className="max-w-xs mx-auto">
              <div className="flex border border-ash mb-4 w-max mx-auto">
                {(['lb', 'kg'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnits(u)}
                    className={`min-h-11 px-6 font-display text-[0.7rem] tracking-[0.15em] uppercase transition-colors ${
                      units === u ? 'bg-iron text-souls' : 'text-bone-dim'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                placeholder={units === 'lb' ? 'bodyweight, e.g. 172' : 'bodyweight, e.g. 78'}
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value)
                  if (weightError) setWeightError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && submitWeight()}
                aria-invalid={!!weightError}
                className={`input-dark min-h-14 text-center text-souls font-display text-xl ${
                  weightError ? 'border-blood-bright' : ''
                }`}
                aria-label="bodyweight"
              />
              <AnimatePresence>
                {weightError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="alert"
                    className="font-ui text-xs text-blood-bright mt-2 text-center"
                  >
                    {weightError}
                  </motion.p>
                )}
              </AnimatePresence>
              <button onClick={submitWeight} className="btn-ember w-full min-h-12 mt-4">
                Continue
              </button>
            </div>
          )}

          {/* ---- step 1: body-fat band ---- */}
          {step === 1 &&
            VESSELS.map((v) => (
              <Card
                key={v.bf}
                label={v.label}
                desc={v.desc}
                onClick={() => {
                  setBodyFat(v.bf)
                  setStep(2)
                }}
              />
            ))}

          {/* ---- step 2: goal ---- */}
          {step === 2 &&
            GOALS.map((g) => (
              <Card
                key={g.id}
                label={g.label}
                desc={g.desc}
                onClick={() => {
                  setGoal(g.id)
                  setStep(3)
                }}
              />
            ))}

          {/* ---- step 3: experience ---- */}
          {step === 3 &&
            EXPERIENCES.map((e) => (
              <Card
                key={e.id}
                label={e.label}
                desc={e.desc}
                onClick={() => {
                  setExperience(e.id)
                  setStep(4)
                }}
              />
            ))}

          {/* ---- step 4: days per week ---- */}
          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              {DAY_CHOICES.map((d) => (
                <motion.button
                  key={d}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => finish(d)}
                  className="panel panel-ornate min-h-24 flex flex-col items-center justify-center"
                >
                  <span className="stat-souls text-3xl leading-none">{d}</span>
                  <span className="font-ui text-xs text-bone-dim mt-1">
                    {d === 5 ? 'days or more' : 'days a week'}
                  </span>
                </motion.button>
              ))}
            </div>
          )}

          {/* ---- step 5: the forged covenant ---- */}
          {step === 5 && plan && (
            <div className="space-y-4">
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: { delay: 0.15 } }}
                  className="font-display text-glow-ember text-xl tracking-[0.2em] uppercase"
                >
                  {plan.title}
                </motion.div>
                <p className="text-bone-dim italic text-sm mt-2">{plan.decree}</p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ['kcal', plan.macroGoals.calories],
                    ['protein', plan.macroGoals.protein],
                    ['carbs', plan.macroGoals.carbs],
                    ['fats', plan.macroGoals.fats],
                  ] as [string, number][]
                ).map(([l, v]) => (
                  <div key={l} className="panel p-2.5 text-center">
                    <div className="stat-souls text-base leading-none">{v.toLocaleString()}</div>
                    <div className="font-ui text-[0.6rem] text-faded mt-1">{l}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {plan.routines.map((r) => (
                  <div key={r.name} className="panel panel-ornate p-3.5">
                    <div className="font-display text-souls text-xs tracking-[0.12em] uppercase mb-0.5">
                      {r.name}
                    </div>
                    <p className="font-ui text-[0.65rem] text-bone-dim">{r.movements.join(' · ')}</p>
                  </div>
                ))}
              </div>

              <button onClick={accept} className="btn-ember animate-ember-pulse w-full min-h-13">
                Accept the Covenant
              </button>
              <p className="font-ui text-[0.65rem] text-faded text-center">
                All of it may be reforged later — settings, goals, and grimoire alike.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 5 && (
        <button
          onClick={onDone}
          className="mt-5 font-ui text-xs text-faded hover:text-bone-dim transition-colors min-h-8"
        >
          face the iron unguided
        </button>
      )}
    </motion.div>
  )
}
