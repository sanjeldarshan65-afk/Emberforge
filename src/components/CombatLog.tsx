import { useState, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { useGame, MOVEMENTS } from '../state/store'
import type { Movement } from '../state/store'
import { useToast } from '../ui/toastContext'
import RestTimer from './RestTimer'
import PlateForge from './PlateForge'
import VictoryScroll from './VictoryScroll'
import type { ScrollData } from './VictoryScroll'
import VictoryOverlay from './VictoryOverlay'
import type { Victory } from './VictoryOverlay'
import type { Routine } from '../state/store'
import { useSound } from '../ui/sound'
import ExercisePicker from './ExercisePicker'
import { pick, VICTORY_LINES } from '../ui/flavor'

/* heavy gate modals — code-split so their chunks load on first open, not with Combat */
const TheGrimoire = lazy(() => import('./TheGrimoire'))
const BossEncounters = lazy(() => import('./BossEncounters'))

type SetRow = { id: number; reps: string; weight: string; done: boolean; failed: boolean }

let nextId = 100
const newRow = (weight = '', reps = ''): SetRow => ({ id: nextId++, weight, reps, done: false, failed: false })
const freshRows = (): SetRow[] => [newRow(), newRow(), newRow()]

const SWIPE_PX = 110 // commit threshold

/* inscribed by the first flame — always available */
const STARTER_PLANS: Routine[] = [
  { id: 'starter-vtaper', name: 'The V-Taper Ascendant', movements: ['Overhead Press', 'Bench Press', 'Barbell Row'] },
  { id: 'starter-earth', name: 'Foundation of Earth', movements: ['Squat', 'Deadlift'] },
  { id: 'starter-trinity', name: 'The Iron Trinity', movements: ['Squat', 'Bench Press', 'Deadlift'] },
]

/* ---------- gesture icons ---------- */
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M4 7 L20 7 M9 7 L9 5 L15 5 L15 7 M6.5 7 L7.5 20 L16.5 20 L17.5 7 M10 10.5 L10 16.5 M14 10.5 L14 16.5" />
  </svg>
)
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="8" width="12" height="12" rx="1" />
    <path d="M16 8 L16 4.5 L4.5 4.5 L4.5 16 L8 16" />
  </svg>
)
const AnvilIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M4 7 L20 7 C19 10.2 16 12 12.5 12 L12.5 15.5 C14.2 15.8 15.2 16.8 15.2 18.5 L8.8 18.5 C8.8 16.8 9.8 15.8 11.5 15.5 L11.5 12 C7.5 11.8 4.6 9.6 4 7 Z" />
  </svg>
)
/* a snapped blade — mark a set as a Bloodstain (failed attempt) */
const BloodstainIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 3 L11.5 10 L13.5 11.5" />
    <path d="M10 13.5 L8.5 20 M6.5 18 L11 18" />
  </svg>
)

/* ================================================================
   SWIPEABLE SET ROW
   left  ← discard (red, trash)   ·   right → duplicate (gold, copy)
   ================================================================ */
function SwipeableSet({
  row,
  index,
  pr,
  onPatch,
  onDelete,
  onDuplicate,
  onForge,
  barWeight,
  units,
  ghost,
  onFill,
}: {
  row: SetRow
  index: number
  pr: number
  onPatch: (id: number, patch: Partial<SetRow>) => void
  onDelete: (id: number) => void
  onDuplicate: (row: SetRow) => void
  onForge: (weight: number) => void
  barWeight: number
  units: string
  ghost?: { weight: number; reps: number }
  onFill: (id: number, g: { weight: number; reps: number }) => void
}) {
  const canForge = Number(row.weight) > barWeight
  const x = useMotionValue(0)
  const discardOpacity = useTransform(x, [-SWIPE_PX, -28], [1, 0])
  const copyOpacity = useTransform(x, [28, SWIPE_PX], [0, 1])
  const rowBorder = useTransform(
    x,
    [-SWIPE_PX, 0, SWIPE_PX],
    ['#dc2626', row.done ? '#4d4335' : '#2e271e', '#9c7f35']
  )

  const beatsPR = Number(row.weight) > pr && pr > 0
  const showFill = !!ghost && !row.done && !row.weight && !row.reps
  const readyToLog = !row.done && !!row.weight && !!row.reps

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_PX) onDelete(row.id)
    else if (info.offset.x > SWIPE_PX) onDuplicate(row)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.25 } }}
      className="relative overflow-hidden"
    >
      {/* duplicate underlay — right swipe */}
      <motion.div
        style={{ opacity: copyOpacity }}
        className="absolute inset-0 flex items-center gap-2 pl-5 bg-souls-dim/25 border border-souls-dim text-souls font-display text-[0.6rem] tracking-[0.2em] uppercase"
        aria-hidden
      >
        <CopyIcon /> Duplicate
      </motion.div>

      {/* discard underlay — left swipe */}
      <motion.div
        style={{ opacity: discardOpacity }}
        className="absolute inset-0 flex items-center justify-end gap-2 pr-5 bg-blood/40 border border-blood-bright text-blood-bright font-display text-[0.6rem] tracking-[0.2em] uppercase"
        aria-hidden
      >
        Discard <TrashIcon />
      </motion.div>

      {/* the draggable slab — heavy elastic so it fights back */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 32 }}
        onDragEnd={handleDragEnd}
        style={{ x, borderColor: rowBorder }}
        animate={
          row.done
            ? {
                boxShadow: [
                  '0 0 0px rgba(255,117,24,0)',
                  '0 0 28px rgba(255,117,24,0.55)',
                  '0 0 0px rgba(255,117,24,0)',
                ],
              }
            : undefined
        }
        transition={row.done ? { duration: 0.9, ease: 'easeOut' } : undefined}
        className={`panel [transition:none] flex items-center gap-2 p-3 relative touch-pan-y ${row.failed ? 'opacity-50' : ''}`}
      >
        <div className={`font-display text-sm w-8 shrink-0 text-center ${row.failed ? 'text-blood-bright' : 'text-souls-dim'}`}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <div className="flex-1 relative">
          <input
            type="number"
            inputMode="decimal"
            placeholder={ghost ? String(ghost.weight) : 'weight'}
            value={row.weight}
            disabled={row.done}
            onChange={(e) => onPatch(row.id, { weight: e.target.value })}
            className={`input-dark min-h-12 text-center disabled:opacity-60 placeholder:text-stone ${canForge ? 'pr-10' : ''} ${showFill ? 'pl-8' : ''}`}
            aria-label="weight"
          />
          {showFill && (
            <button
              onClick={() => onFill(row.id, ghost)}
              aria-label="fill from last session"
              className="absolute left-0.5 top-1/2 -translate-y-1/2 min-h-10 min-w-8 flex items-center justify-center text-souls drop-shadow-[0_0_5px_rgba(230,195,92,0.6)]"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12 H17 M13 7 L18 12 L13 17" />
              </svg>
            </button>
          )}
          {canForge && (
            <motion.button
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onForge(Number(row.weight))}
              aria-label="open plate blacksmith"
              className="absolute right-1 top-1/2 -translate-y-1/2 min-h-10 min-w-10 flex items-center justify-center text-ember drop-shadow-[0_0_7px_rgba(255,117,24,0.8)]"
            >
              <AnvilIcon />
            </motion.button>
          )}
          {beatsPR && !row.done && (
            <span className="absolute -top-2 right-1 px-1 bg-void font-display text-[0.55rem] tracking-[0.2em] text-glow-ember animate-flicker">
              &#9650; NEW PR
            </span>
          )}
        </div>

        <span className="text-faded font-ui text-xs shrink-0">{units} &times;</span>

        <input
          type="number"
          inputMode="numeric"
          placeholder={ghost ? String(ghost.reps) : 'reps'}
          value={row.reps}
          disabled={row.done}
          onChange={(e) => onPatch(row.id, { reps: e.target.value })}
          className="input-dark min-h-12 w-16 text-center disabled:opacity-60"
          aria-label="repetitions"
        />

        <button
          onClick={() => onPatch(row.id, { done: !row.done, failed: false })}
          disabled={!row.done && (!row.weight || !row.reps)}
          aria-label={row.done ? 'undo set' : 'complete set'}
          className={`min-h-12 w-14 shrink-0 flex flex-col items-center justify-center gap-0.5 border transition-all duration-200 disabled:opacity-30 ${
            row.done
              ? 'border-ember bg-ember/15 text-glow-ember shadow-ember-glow'
              : readyToLog
                ? 'border-ember text-ember animate-ember-pulse'
                : 'border-ash text-bone-dim active:border-ember'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 13l4 4L19 6" />
          </svg>
          <span className="font-display text-[0.5rem] tracking-[0.15em] uppercase leading-none">
            {row.done ? 'Slain' : 'Slay'}
          </span>
        </button>

        {/* Bloodstain — mark this set a failed attempt */}
        <button
          onClick={() => onPatch(row.id, { failed: !row.failed, done: false })}
          aria-label={row.failed ? 'clear the bloodstain' : 'mark a failed attempt'}
          className={`min-h-12 min-w-9 shrink-0 border flex items-center justify-center transition-colors duration-200 ${
            row.failed
              ? 'border-blood-bright text-blood-bright bg-blood/30'
              : 'border-ash text-faded active:border-blood-bright'
          }`}
        >
          <BloodstainIcon />
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ================================================================
   COMBAT LOG
   ================================================================ */
export default function CombatLog() {
  const prs = useGame((s) => s.prs)
  const endBattle = useGame((s) => s.endBattle)
  const battles = useGame((s) => s.battles)
  const routines = useGame((s) => s.routines)
  const toast = useToast()
  const settings = useGame((s) => s.settings)
  const { thud, toll } = useSound()

  const [mode, setMode] = useState<'gate' | 'battle'>('gate')
  const [plan, setPlan] = useState<Movement[] | null>(null)
  const [sheets, setSheets] = useState<Record<string, SetRow[]>>({})
  const [showGrimoire, setShowGrimoire] = useState(false)
  const [grimoireCreating, setGrimoireCreating] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showBosses, setShowBosses] = useState(false)
  /* code-split latches: mount a gate modal only after its first open — defers the chunk,
     then keeps it mounted so its exit animation still plays on close */
  const grimoireEver = useRef(false)
  const bossesEver = useRef(false)
  if (showGrimoire) grimoireEver.current = true
  if (showBosses) bossesEver.current = true

  const [movement, setMovement] = useState<Movement>('Squat')
  const [rows, setRows] = useState<SetRow[]>(freshRows)
  const [victory, setVictory] = useState<Victory | null>(null)
  const [timerNonce, setTimerNonce] = useState(0)
  const [plateWeight, setPlateWeight] = useState<number | null>(null)
  const [scroll, setScroll] = useState<ScrollData | null>(null)
  const [victoryLine, setVictoryLine] = useState<string>(VICTORY_LINES[0])
  const [restOpen, setRestOpen] = useState(false)

  const pr = prs[movement] ?? 0

  /* routine targets are drawn from previous records */
  const prefillRows = (m: Movement) => {
    const w = (prs[m] ?? 0) > 0 ? String(prs[m]) : ''
    return [newRow(w), newRow(w), newRow(w)]
  }

  const enterVoid = () => {
    setPlan(null)
    setSheets({})
    setRows(freshRows())
    setMode('battle')
  }

  const wieldRoutine = (r: Routine) => {
    setPlan(r.movements)
    setSheets({})
    setMovement(r.movements[0])
    setRows(prefillRows(r.movements[0]))
    setShowGrimoire(false)
    setMode('battle')
    toast(`Battle plan: ${r.name}`, 'souls')
  }

  const fleeToCrossroads = () => {
    setMode('gate')
    setPlan(null)
    setSheets({})
    setRows(freshRows())
  }

  const selectMovement = (m: Movement) => {
    if (m === movement) return
    /* stow the current lift's sets, then restore the target lift's (or a fresh sheet).
       Each exercise keeps its own sets for the length of the session. */
    setSheets((s) => ({ ...s, [movement]: rows }))
    setRows(sheets[m] ?? (plan ? prefillRows(m) : freshRows()))
    setMovement(m)
  }

  const patchRow = (id: number, patch: Partial<SetRow>) => {
    if (patch.done === true) {
      thud()
      if (settings.autoRestTimer) setTimerNonce((n) => n + 1) // set complete -> rest begins
    }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const deleteRow = (id: number) => {
    setRows((rs) => rs.filter((r) => r.id !== id))
    toast('Set discarded', 'blood')
  }

  const duplicateRow = (row: SetRow) => {
    setRows((rs) => {
      const i = rs.findIndex((r) => r.id === row.id)
      return [...rs.slice(0, i + 1), newRow(row.weight, row.reps), ...rs.slice(i + 1)]
    })
    toast('Set duplicated', 'souls')
  }

  const addRow = () => setRows((rs) => [...rs, newRow()])

  const completedSets = rows.filter((r) => r.done)
  /* the session may be ended if ANY lift — the active sheet or a stowed one — has a completed set */
  const canFinish =
    completedSets.length > 0 ||
    Object.entries(sheets).some(([m, rs]) => m !== movement && rs.some((r) => r.done))

  /* session-wide totals: every completed set across the active sheet + every stowed lift */
  const sessionDone = [
    ...completedSets,
    ...Object.entries(sheets).flatMap(([m, rs]) => (m === movement ? [] : rs.filter((r) => r.done))),
  ]
  const sessionTonnage = sessionDone.reduce((t, r) => t + Number(r.weight) * Number(r.reps), 0)
  const sessionSets = sessionDone.length

  /* ---- iron memory: the log remembers thy last clash with this foe ---- */
  const lastBattle = battles.find((b) => b.movement === movement)
  const fillRow = (id: number, g: { weight: number; reps: number }) =>
    patchRow(id, { weight: String(g.weight), reps: String(g.reps) })
  const lastVolume = lastBattle?.volume ?? 0

  const finishBattle = () => {
    /* Every lift with at least one completed set is logged as its own battle,
       then their spoils are gathered into a single Victory. */
    const consolidated: Record<string, SetRow[]> = { ...sheets, [movement]: rows }
    const keys = (plan ?? Object.keys(consolidated)) as string[]
    const toLog = keys
      .filter((m, i, a) => a.indexOf(m) === i)
      .filter((m) => (consolidated[m] ?? []).some((row) => row.done))
    if (toLog.length === 0) return

    const xpBefore = useGame.getState().xp
    let totalXp = 0
    let totalSouls = 0
    let tonnage = 0
    let anyPR = false
    let anyLevel = false
    let anyAscended = false
    let newLevel = 0
    const drops: string[] = []
    let share: ScrollData | undefined

    for (const mv of toLog) {
      const sets = (consolidated[mv] ?? [])
        .filter((row) => row.done)
        .map((row) => ({ weight: Number(row.weight), reps: Number(row.reps) }))
      const rr = endBattle(mv as Movement, sets)
      totalXp += rr.xp
      totalSouls += rr.souls
      tonnage += sets.reduce((t, x) => t + x.weight * x.reps, 0)
      anyPR = anyPR || rr.prBroken
      anyLevel = anyLevel || rr.leveledUp
      anyAscended = anyAscended || rr.ascended
      newLevel = rr.newLevel || newLevel
      drops.push(...rr.drops)
      if (rr.prBroken && !share) {
        const top = sets.reduce((a, b) => (b.weight > a.weight ? b : a), sets[0])
        share = { movement: mv as Movement, weight: top.weight, reps: top.reps, xp: rr.xp, souls: rr.souls }
      }
    }

    toll()
    setVictoryLine(pick(VICTORY_LINES))
    setVictory({
      reward: {
        movement: toLog[0] as Movement,
        xp: totalXp,
        souls: totalSouls,
        leveledUp: anyLevel,
        newLevel,
        prBroken: anyPR,
        ascended: anyAscended,
        drops,
      },
      tonnage,
      xpBefore,
      xpAfter: xpBefore + totalXp,
      share,
    })
    /* No toasts here — the Victory Overlay already shows souls, XP, records and
       level-ups; firing them as toasts too buried the overlay under a stack of
       duplicates. Every lift is now recorded; Claim Rewards / Share ends the
       session cleanly via endAndExit. */
  }

  /* Claim Rewards / Share both terminate the session and return to the gate */
  const endAndExit = () => {
    setVictory(null)
    fleeToCrossroads()
  }

  /* ============ THE CROSSROADS ============ */
  if (mode === 'gate') {
    return (
      <div className="space-y-6">
        <div className="divider-ornate">Combat Log</div>
        <p className="text-bone-dim italic text-center">How wilt thou face the iron this day?</p>

        {/* ---- battle plans: horizontally scrolling grimoire pages ---- */}
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-3 snap-x snap-mandatory w-max pb-1">
            {[...routines, ...STARTER_PLANS].map((r) => (
              <motion.button
                key={r.id}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -2 }}
                onClick={() => wieldRoutine(r)}
                className="panel panel-ornate snap-start shrink-0 w-56 p-4 text-left"
              >
                <div className="font-display text-souls text-sm tracking-[0.12em] uppercase mb-1.5 leading-snug">
                  {r.name}
                </div>
                <p className="font-ui text-[0.65rem] text-bone-dim leading-relaxed">
                  {r.movements.join(' · ')}
                </p>
                <p className="font-ui text-[0.6rem] text-faded mt-2">
                  {r.movements.length} foes · targets from thy records
                </p>
              </motion.button>
            ))}

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setGrimoireCreating(true)
                setShowGrimoire(true)
              }}
              className="snap-start shrink-0 w-40 p-4 border border-dashed border-stone bg-charcoal/50 flex flex-col items-center justify-center text-center"
            >
              <span className="text-souls text-2xl leading-none mb-1.5">+</span>
              <span className="font-display text-[0.6rem] tracking-[0.2em] uppercase text-bone-dim">
                Scribe New Plan
              </span>
            </motion.button>
          </div>
        </div>

        <button
          onClick={() => setShowBosses(true)}
          className="panel panel-ornate w-full p-5 text-left"
          style={{ borderColor: 'var(--color-blood-bright)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-blood-bright tracking-[0.2em] uppercase text-sm mb-1">
                Boss Encounters
              </div>
              <p className="font-ui text-xs text-bone-dim">
                Great enemies of the iron. Fell them for souls and trophies.
              </p>
            </div>
            <span className="text-blood-bright text-xl leading-none">&#9876;</span>
          </div>
        </button>

        <button onClick={enterVoid} className="panel panel-ornate w-full p-5 text-left">
          <div className="font-display text-souls tracking-[0.2em] uppercase text-sm mb-1">
            Enter the Void
          </div>
          <p className="font-ui text-xs text-bone-dim">
            A freestyle battle. Choose thy foes as they come.
          </p>
        </button>

        <button
          onClick={() => {
            setGrimoireCreating(false)
            setShowGrimoire(true)
          }}
          className="w-full min-h-9 font-ui text-xs text-faded hover:text-bone-dim transition-colors"
        >
          manage the grimoire
        </button>

        {bossesEver.current && (
          <Suspense fallback={null}>
            <BossEncounters open={showBosses} onClose={() => setShowBosses(false)} />
          </Suspense>
        )}

        {grimoireEver.current && (
          <Suspense fallback={null}>
            <TheGrimoire
              open={showGrimoire}
              onClose={() => setShowGrimoire(false)}
              onSelect={wieldRoutine}
              startCreating={grimoireCreating}
            />
          </Suspense>
        )}
      </div>
    )
  }

  /* ============ THE BATTLE ============ */
  return (
    <div
      className="space-y-6 transition-[padding] duration-300"
      style={{ paddingTop: restOpen ? '5.5rem' : undefined }}
    >
      <div className="flex items-center gap-3">
        <div className="divider-ornate flex-1">Combat Log</div>
        <button
          onClick={fleeToCrossroads}
          className="font-ui text-xs text-faded hover:text-bone-dim transition-colors min-h-8"
        >
          flee
        </button>
      </div>

      {/* ---- iron memory: live tonnage vs the last session ---- */}
      <div className="sticky top-2 z-30">
        <div className="panel bg-void/70 backdrop-blur-md flex items-center justify-between px-4 py-2.5">
          <span className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">
            Total Tonnage
          </span>
          <span className="font-ui text-xs">
            <span className="stat-souls text-base">{sessionTonnage.toLocaleString()}</span>
            <span className="text-faded"> {settings.units}</span>
            {!plan && lastVolume > 0 && (
              <span className={sessionTonnage >= lastVolume ? 'text-verdant' : 'text-faded'}>
                {' '}&middot; last {lastVolume.toLocaleString()}
                {sessionTonnage >= lastVolume ? ' \u25B2' : ''}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ---- battle plan strip: tap a foe to switch; each keeps its own sets ---- */}
      {plan && (
        <>
          <div className="flex flex-wrap gap-2 justify-center">
            {plan.map((m, i) => {
              const active = m === movement
              const logged = (active ? rows : (sheets[m] ?? [])).some((r) => r.done)
              return (
                <button
                  key={`${m}-${i}`}
                  onClick={() => selectMovement(m)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 border font-display text-[0.6rem] tracking-[0.15em] uppercase transition-colors ${
                    active
                      ? 'border-ember text-glow-ember shadow-ember-glow'
                      : logged
                        ? 'border-souls-dim text-souls'
                        : 'border-ash text-bone-dim active:border-souls-dim'
                  }`}
                >
                  {logged && !active ? '\u2713 ' : ''}
                  {m}
                </button>
              )
            })}
          </div>
          <div className="font-display text-bone text-lg tracking-wider text-center">{movement}</div>
        </>
      )}

      {/* ---- movement select: big tap targets (freestyle only) ---- */}
      {!plan && (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {((MOVEMENTS as readonly string[]).includes(movement)
          ? (MOVEMENTS as readonly string[])
          : [movement, ...MOVEMENTS]
        ).map((m) => (
          <button
            key={m}
            onClick={() => selectMovement(m)}
            className={`min-h-12 px-3 font-display text-[0.7rem] tracking-[0.15em] uppercase border transition-colors duration-200 ${
              m === movement
                ? 'text-souls border-souls-dim bg-iron shadow-souls-glow'
                : 'text-bone-dim border-ash bg-charcoal active:bg-iron'
            }`}
          >
            {m}
          </button>
        ))}
        <button
          onClick={() => setShowPicker(true)}
          className="min-h-12 px-3 font-display text-[0.7rem] tracking-[0.15em] uppercase border border-dashed border-stone text-bone-dim bg-charcoal/60 active:bg-iron transition-colors"
        >
          &#8943; All Rites
        </button>
      </div>
      )}

      {/* ---- previous PR: styled like an in-game buff ---- */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-souls-dim bg-iron">
          <span className="text-souls text-lg leading-none">&#9751;</span>
          <div>
            <div className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-souls-dim">
              Buff &middot; Record to Break
            </div>
            <div className="stat-souls text-base leading-tight">
              {pr > 0 ? `${pr} ${settings.units}` : '— unclaimed —'}
            </div>
          </div>
        </div>
        <p className="text-faded italic text-sm">
          {pr > 0 ? 'Surpass it, and grow mighty.' : 'No record stands. Forge the first.'}
        </p>
      </div>

      <p className="font-ui text-xs text-faded text-center">
        swipe left to discard &middot; right to duplicate &middot; tap &#9670; to undo a set
      </p>

      {/* ---- set rows ---- */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => (
            <SwipeableSet
              key={row.id}
              row={row}
              index={i}
              pr={pr}
              onPatch={patchRow}
              onDelete={deleteRow}
              onDuplicate={duplicateRow}
              onForge={setPlateWeight}
              barWeight={settings.barWeight}
              units={settings.units}
              ghost={lastBattle?.sets[i]}
              onFill={fillRow}
            />
          ))}
        </AnimatePresence>

        {rows.length === 0 && (
          <div className="panel p-6 text-center">
            <p className="text-bone-dim italic">All sets discarded. Add another, or flee.</p>
          </div>
        )}
      </div>

      {/* ---- actions ---- */}
      <div className="flex items-center gap-3">
        <button onClick={addRow} className="btn-hollow min-h-12 flex-1">
          + Another Set
        </button>
        <button
          disabled={!canFinish}
          className="btn-ember min-h-12 flex-1"
          onClick={finishBattle}
        >
          End Battle
        </button>
      </div>

      {sessionSets > 0 && (
        <p className="text-center font-ui text-xs text-bone-dim">
          {plan
            ? `${sessionSets} ${sessionSets === 1 ? 'set' : 'sets'} vanquished this session`
            : `${completedSets.length} / ${rows.length} sets vanquished`}
        </p>
      )}

      <RestTimer trigger={timerNonce} onOpenChange={setRestOpen} />

      <PlateForge weight={plateWeight} onClose={() => setPlateWeight(null)} />

      <ExercisePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onPick={(m) => {
          selectMovement(m)
          setShowPicker(false)
        }}
      />

      <VictoryScroll
        scroll={scroll}
        onClose={() => {
          setScroll(null)
          fleeToCrossroads()
        }}
      />

      <VictoryOverlay
        victory={victory}
        line={victoryLine}
        units={settings.units}
        onClose={endAndExit}
        onShare={(d) => {
          setVictory(null)
          setScroll(d)
        }}
      />
    </div>
  )
}
