import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, statusEffects, ASCEND_MULT, CURSE_DRAIN, epley } from '../state/store'
import type { Battle, Vitals } from '../state/store'
import Avatar from './Avatar'
import SoulsLedger from './SoulsLedger'
import SigilVault from './SigilVault'
import WeightLedger from './WeightLedger'

/* ---------- animation presets ---------- */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const VITAL_FIELDS: { key: keyof Vitals; label: string; unit: string; step: number }[] = [
  { key: 'bodyweight', label: 'Bodyweight', unit: 'lb', step: 0.1 },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', step: 0.1 },
  { key: 'waist', label: 'Waist', unit: 'in', step: 0.25 },
  { key: 'shoulders', label: 'Shoulders', unit: 'in', step: 0.25 },
  { key: 'chest', label: 'Chest', unit: 'in', step: 0.25 },
]

const battleDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function Dashboard() {
  const vitals = useGame((s) => s.vitals)
  const setVital = useGame((s) => s.setVital)
  const battles = useGame((s) => s.battles)
  const settings = useGame((s) => s.settings)
  const logWeight = useGame((s) => s.logWeight)
  const [editing, setEditing] = useState(false)
  const [openBattle, setOpenBattle] = useState<Battle | null>(null)

  const { streak, daysSinceLast, ascended, cursed } = statusEffects(battles)
  /* muscle-heat now lives in the store; recompute only when the log changes */
  const fatigue = useMemo(() => useGame.getState().fatigue(), [battles])

  const leanMass = vitals.bodyweight * (1 - vitals.bodyFat / 100)
  const ratio = vitals.shoulders / vitals.waist
  const taperPct = Math.min((ratio / settings.taperGoal) * 100, 100)

  /* panels transform under status effects */
  const panelCls = cursed
    ? 'panel border-blood/70 [filter:grayscale(0.55)_brightness(0.85)]'
    : ascended
      ? 'panel border-souls-dim/70 shadow-souls-glow'
      : 'panel'

  /* vitals honor the chosen covenant of measure */
  const vitalUnit = (key: keyof Vitals) =>
    key === 'bodyFat'
      ? '%'
      : key === 'bodyweight'
        ? settings.units
        : settings.units === 'kg'
          ? 'cm'
          : 'in'

  const fracture = (i: number) =>
    cursed ? (i % 2 === 0 ? '-rotate-[0.5deg]' : 'rotate-[0.4deg]') : ''

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      {/* ============ STATUS EFFECTS ============ */}
      <AnimatePresence initial={false}>
        {cursed && (
          <motion.div
            key="curse-banner"
            variants={fadeUp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="death-banner !py-6 !text-2xl animate-flicker">
              CURSE MARK OF DEATH
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(ascended || cursed) && (
        <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
          {ascended && (
            <div className="inline-flex items-center gap-2 px-3 py-2 border border-souls bg-iron shadow-souls-glow">
              <span className="text-souls text-lg leading-none animate-flicker">&#9788;</span>
              <div>
                <div className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-souls">
                  Buff &middot; Ascension
                </div>
                <div className="font-ui text-xs text-bone-dim">
                  {streak}-day streak &middot; souls &times;{ASCEND_MULT}
                </div>
              </div>
            </div>
          )}
          {cursed && (
            <div className="inline-flex items-center gap-2 px-3 py-2 border border-blood-bright/70 bg-blood/20">
              <span className="text-blood-bright text-lg leading-none animate-flicker">&#9760;</span>
              <div>
                <div className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-blood-bright">
                  Debuff &middot; Curse Mark of Death
                </div>
                <div className="font-ui text-xs text-bone-dim">
                  {daysSinceLast} days hollow &middot; &minus;{CURSE_DRAIN * 100}% souls each day
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {cursed && (
        <motion.p variants={fadeUp} className="text-faded italic text-sm -mt-4">
          The mark festers upon thy sheet. Only battle can lift it — return to the Combat Log.
        </motion.p>
      )}

      {/* ============ CHARACTER SHEET ============ */}
      <motion.section variants={fadeUp} className="relative">
        {/* ascension aura — a breathing golden halo behind the sheet */}
        {ascended && (
          <motion.div
            aria-hidden
            animate={{ opacity: [0.25, 0.65, 0.25] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-4 -z-10 blur-lg bg-[radial-gradient(ellipse_at_center,rgba(230,195,92,0.28),transparent_70%)]"
          />
        )}

        <div className="divider-ornate mb-3">Character Sheet</div>

        <div className="flex justify-end mb-3">
          <button
            onClick={() => {
              if (editing) logWeight(vitals.bodyweight) // sealing records a weigh-in
              setEditing((e) => !e)
            }}
            className="btn-hollow min-h-10 px-4 text-[0.6rem]"
          >
            {editing ? '✓ Seal the Record' : '✎ Amend Measurements'}
          </button>
        </div>

        {/* the vessel itself */}
        {settings.showAvatar && (
          <div className="flex justify-center mb-5">
            <Avatar ratio={ratio} cursed={cursed} ascended={ascended} fatigue={fatigue} />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VITAL_FIELDS.map((f, i) => (
            <div key={f.key} className={`${panelCls} ${fracture(i)} p-4`}>
              <div className="font-display text-[0.65rem] tracking-[0.2em] uppercase text-bone-dim mb-1">
                {f.label}
              </div>
              {editing ? (
                <input
                  type="number"
                  inputMode="decimal"
                  step={f.step}
                  value={vitals[f.key]}
                  onChange={(e) => setVital(f.key, Number(e.target.value) || 0)}
                  className="input-dark min-h-10 text-center text-souls font-display"
                  aria-label={f.label}
                />
              ) : (
                <div className="stat-souls text-2xl leading-none">
                  {vitals[f.key]}
                  <span className="text-sm text-souls-dim ml-1">{vitalUnit(f.key)}</span>
                </div>
              )}
            </div>
          ))}

          {/* derived - never editable */}
          <div className={`${panelCls} ${fracture(5)} p-4`}>
            <div className="font-display text-[0.65rem] tracking-[0.2em] uppercase text-bone-dim mb-1">
              Lean Mass
            </div>
            <div className="stat-souls text-2xl leading-none">
              {leanMass.toFixed(1)}
              <span className="text-sm text-souls-dim ml-1">{settings.units}</span>
            </div>
            <div className="font-ui text-xs text-faded mt-2">derived</div>
          </div>
        </div>
      </motion.section>

      {/* ============ V-TAPER QUEST ============ */}
      <motion.section variants={fadeUp}>
        <div className={`${panelCls} panel-ornate p-5`}>
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-display text-souls text-sm tracking-[0.2em] uppercase">
              Quest: The Golden Taper
            </h3>
            <span className="font-ui text-xs text-bone-dim">shoulder : waist</span>
          </div>
          <p className="text-bone-dim italic text-sm mb-4">
            Forge the V — widen the shoulders, carve the waist, until the ratio of legend is thine.
          </p>

          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="stat-souls text-3xl">{ratio.toFixed(3)}</span>
              <span className="text-bone-dim text-sm ml-2">current</span>
            </div>
            <div className="text-right">
              <span className="text-glow-ember font-display text-xl">{settings.taperGoal}</span>
              <span className="text-bone-dim text-sm ml-2">goal</span>
            </div>
          </div>

          <div className="h-2 bg-abyss border border-ash relative overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${taperPct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
              className="h-full bg-gradient-to-r from-ember-deep via-ember to-souls"
            />
          </div>
          <div className="font-ui text-xs text-faded mt-2 text-right">
            {taperPct.toFixed(1)}% of the way to the golden ratio
          </div>
        </div>
      </motion.section>

      {/* ============ THE VESSEL'S BURDEN ============ */}
      <motion.section variants={fadeUp}>
        <div className="divider-ornate mb-4">The Vessel's Burden</div>
        <WeightLedger />
      </motion.section>

      {/* ============ RECENT BATTLES ============ */}
      <motion.section variants={fadeUp}>
        <div className="divider-ornate mb-4">Recent Battles</div>

        {battles.length === 0 ? (
          <div className="panel p-6 text-center">
            <p className="text-bone-dim italic">
              No battles yet fought. The Combat Log awaits thy first clash with the iron.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {battles.slice(0, 5).map((b, i) => (
              <button
                key={b.id}
                onClick={() => setOpenBattle(b)}
                className={`${panelCls} panel-ornate ${fracture(i)} p-4 flex items-center justify-between w-full text-left`}
              >
                <div>
                  <div className="font-display text-bone tracking-wider">
                    {b.movement}
                    {b.newPR && (
                      <span className="ml-2 text-[0.6rem] font-bold tracking-[0.2em] text-glow-ember align-middle">
                        &#9670; NEW RECORD
                      </span>
                    )}
                  </div>
                  <div className="font-ui text-xs text-faded mt-0.5">
                    {battleDate(b.date)} &middot; {b.sets.length} sets &middot; {b.volume.toLocaleString()} lb moved
                  </div>
                </div>
                <div className="text-right">
                  <div className="stat-souls text-xl leading-none">
                    {b.topWeight}
                    <span className="text-souls-dim text-sm"> lb &times; {b.topReps}</span>
                  </div>
                  <div className="font-ui text-xs text-bone-dim mt-1">est. 1RM {b.e1rm} lb</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.section>

      {/* ============ SOULS LEDGER ============ */}
      <motion.section variants={fadeUp}>
        <div className="divider-ornate mb-4">Souls Ledger</div>
        <SoulsLedger />
      </motion.section>

      {/* ============ SIGILS OF THE FORGE ============ */}
      <motion.section variants={fadeUp}>
        <div className="divider-ornate mb-4">Sigils of the Forge</div>
        <SigilVault />
      </motion.section>

      {/* ============ BATTLE CHRONICLE ============ */}
      <AnimatePresence>
        {openBattle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenBattle(null)}
            className="fixed inset-0 z-[62] bg-black/75 flex items-center justify-center px-4 py-8 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.93, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { duration: 0.3 } }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="panel panel-ornate w-full max-w-sm p-5"
            >
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-display text-souls text-lg tracking-[0.12em]">
                  {openBattle.movement}
                </h3>
                {openBattle.newPR && (
                  <span className="text-[0.6rem] font-bold tracking-[0.2em] text-glow-ember">
                    &#9670; NEW RECORD
                  </span>
                )}
              </div>
              <p className="font-ui text-xs text-faded mb-4">
                {new Date(openBattle.date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              <div className="space-y-1.5 mb-4">
                {openBattle.sets.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2 bg-charcoal border border-ash"
                  >
                    <span className="font-display text-souls-dim text-xs w-6">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="stat-souls text-sm flex-1">
                      {s.weight} <span className="text-souls-dim text-xs">&times; {s.reps}</span>
                    </span>
                    <span className="font-ui text-[0.65rem] text-faded">
                      e1RM {epley(s.weight, s.reps)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-ui text-xs text-bone-dim border-t border-ash pt-3">
                <span>{openBattle.sets.length} sets</span>
                <span>{openBattle.volume.toLocaleString()} moved</span>
                <span>best e1RM {openBattle.e1rm}</span>
              </div>

              <button onClick={() => setOpenBattle(null)} className="btn-hollow w-full min-h-12 mt-4">
                Close the Chronicle
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
