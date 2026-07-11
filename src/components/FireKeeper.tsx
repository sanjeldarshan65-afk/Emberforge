import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../state/store'
import { seekGuidance, keeperMindEnabled, setKeeperMind } from '../ai/fireKeeper'
import type { KeeperContext, KeeperTopic } from '../ai/fireKeeper'
import { hasVisionKey } from '../ai/vision'
import { detectDeload } from '../state/deload'
import { fatigueWithRelics } from '../state/recovery'
import { pick, KEEPER_GREETINGS } from '../ui/flavor'

/* ---------- typewriter: NPC dialogue reveal (tap to skip) ---------- */
function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    setN(0)
  }, [text])

  useEffect(() => {
    if (n >= text.length) return
    const t = setTimeout(() => setN((v) => Math.min(v + 2, text.length)), 16)
    return () => clearTimeout(t)
  }, [n, text])

  return (
    <span onClick={() => setN(text.length)} className="cursor-pointer whitespace-pre-line">
      {text.slice(0, n)}
      {n < text.length && <span className="text-ember animate-flicker">&#9612;</span>}
    </span>
  )
}

/* ---------- the keeper's flame sigil ---------- */
function FlameSigil() {
  return (
    <div className="relative w-16 h-16 shrink-0">
      <motion.div
        aria-hidden
        animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.08, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full blur-md bg-[radial-gradient(circle,rgba(255,117,24,0.55),transparent_70%)]"
      />
      <div className="absolute inset-0 border border-souls-dim rounded-full flex items-center justify-center bg-void/60">
        <svg viewBox="0 0 24 24" className="w-7 h-7 animate-flicker" aria-hidden>
          <path
            d="M12 2 C13 6 17 8 17 13 A5 5 0 0 1 7 13 C7 10 9 9 9.5 6.5 C10.5 8 11.5 8.5 11.5 10 A2.5 2.5 0 0 0 12 2 Z"
            fill="var(--color-ember)"
          />
          <path
            d="M12 22 A4.2 4.2 0 0 1 7.8 13 C7.8 13 9 15.5 12 15.5 C15 15.5 16.2 13 16.2 13 A4.2 4.2 0 0 1 12 22 Z"
            fill="var(--color-ember-bright)"
            opacity="0.85"
          />
        </svg>
      </div>
    </div>
  )
}

/* ================================================================
   FIRE KEEPER — the sanctuary dialogue
   ================================================================ */
export default function FireKeeper() {
  const battles = useGame((s) => s.battles)
  const prs = useGame((s) => s.prs)
  const vitals = useGame((s) => s.vitals)
  const taperGoal = useGame((s) => s.settings.taperGoal)
  const units = useGame((s) => s.settings.units)

  const [messages, setMessages] = useState<string[]>(() => [pick(KEEPER_GREETINGS)])
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [deloadDismissed, setDeloadDismissed] = useState(false)

  /* The Fading Flame — recompute overreaching whenever the log or Hoard changes.
     fatigue() folds in any fatigueRecovery relics owned. */
  const inventory = useGame((s) => s.inventory)
  const unlockedNodes = useGame((s) => s.unlockedNodes)
  const fatigue = useMemo(
    () => fatigueWithRelics(battles, new Set(inventory.map((o) => o.id)), new Set(unlockedNodes)),
    [battles, inventory, unlockedNodes]
  )
  const deloadFlags = useMemo(() => detectDeload(battles, fatigue), [battles, fatigue])
  useEffect(() => setDeloadDismissed(false), [battles])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, thinking])

  const [trueMind, setTrueMind] = useState(() => keeperMindEnabled())
  const toggleMind = () => {
    setKeeperMind(!trueMind)
    setTrueMind(!trueMind)
  }

  const consult = async (topic: KeeperTopic = 'counsel') => {
    if (thinking) return
    setThinking(true)
    const ctx: KeeperContext = {
      battles,
      prs,
      vitals,
      taperRatio: vitals.shoulders / vitals.waist,
      taperGoal,
      units,
      fatigue, // relic-adjusted — the Keeper's counsel matches the Fading Flame exactly
    }
    try {
      const reply = await seekGuidance(ctx, topic)
      setMessages((m) => [...m, reply])
    } catch {
      setMessages((m) => [
        ...m,
        'The flame gutters... I cannot see clearly. (The oracle failed — if a true mind is attuned, check that it still burns.)',
      ])
    } finally {
      setThinking(false)
    }
  }

  const TOPICS: { id: KeeperTopic; label: string }[] = [
    { id: 'next', label: 'Next session' },
    { id: 'stall', label: 'Why the stall?' },
    { id: 'weakest', label: 'My weakest work' },
    { id: 'cadence', label: 'My cadence' },
  ]

  return (
    <div className="space-y-6">
      <div className="divider-ornate">Fire Keeper</div>

      {/* ---- the keeper herself ---- */}
      <div className="flex items-center gap-4">
        <FlameSigil />
        <div>
          <h2 className="font-display text-souls text-lg tracking-[0.2em]">FIRE KEEPER</h2>
          <p className="font-ui text-xs text-faded italic">
            Tender of the ember &middot; reader of deeds
          </p>
        </div>
      </div>

      {/* ---- The Fading Flame · auto-deload counsel ---- */}
      <AnimatePresence>
        {deloadFlags.length > 0 && !deloadDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="panel p-4 border-ember/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-glow-ember">
                &#9888; The Flame Fades
              </div>
              <button
                onClick={() => setDeloadDismissed(true)}
                aria-label="dismiss deload counsel"
                className="min-h-8 min-w-8 -mt-1 -mr-1 shrink-0 text-faded hover:text-bone transition-colors"
              >
                &times;
              </button>
            </div>
            <p className="text-bone-dim italic text-sm mt-1 mb-3">
              Thy strength has stalled while the embers still burn. Bank the coals before the flame
              dies — take a lighter session on these lifts.
            </p>
            <div className="space-y-2">
              {deloadFlags.map((d) => (
                <div
                  key={d.movement}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-charcoal border border-ash"
                >
                  <div className="min-w-0">
                    <div className="font-display text-bone text-sm tracking-wider truncate">{d.movement}</div>
                    <div className="font-ui text-[0.65rem] text-faded">
                      {d.primary} aflame &middot; no record in 3 battles
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="stat-souls text-sm leading-none">
                      {d.suggestedTopWeight}
                      <span className="text-souls-dim text-xs"> &times; {d.suggestedSets} sets</span>
                    </div>
                    <div className="font-ui text-[0.6rem] text-faded mt-0.5">
                      from {d.lastTopWeight} &times; {d.lastSets}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- dialogue scroll ---- */}
      <div
        ref={scrollRef}
        className="panel panel-ornate p-1 max-h-[46vh] overflow-y-auto"
      >
        <div className="p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="border-l-2 border-souls-dim/50 pl-4"
              >
                <div className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-souls-dim mb-1">
                  Fire Keeper
                </div>
                <p className="text-bone italic leading-relaxed">
                  {i === messages.length - 1 ? <Typewriter text={msg} /> : <span className="whitespace-pre-line">{msg}</span>}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {thinking && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-faded italic text-sm animate-flicker pl-4"
            >
              The flame stirs, sifting the ashes of thy battles...
            </motion.p>
          )}
        </div>
      </div>

      {/* ---- put a question to the keeper ---- */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            onClick={() => consult(t.id)}
            disabled={thinking}
            className="min-h-10 px-3 border border-souls-dim/40 font-display text-[0.58rem] tracking-[0.15em] uppercase text-bone-dim hover:text-souls hover:border-souls-dim active:border-ember transition-colors disabled:opacity-40"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- seek guidance ---- */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => consult('counsel')}
        disabled={thinking}
        className="btn-ember animate-ember-pulse w-full min-h-14 text-sm"
      >
        {thinking ? 'The Flame Considers...' : 'Seek Guidance'}
      </motion.button>

      <p className="text-center font-ui text-xs text-faded">
        The keeper reads thy Recent Battles and Golden Taper from the ledger.
        {' '}Attune a key in the Cauldron, and a true mind may burn behind her eyes.
      </p>

      {/* ---- the True Mind: opt-in LLM narration over the attuned key ---- */}
      {hasVisionKey() && (
        <button
          role="switch"
          aria-checked={trueMind}
          onClick={toggleMind}
          className="w-full flex items-center justify-center gap-3 min-h-10"
        >
          <span
            className={`relative inline-block w-10 h-6 shrink-0 border transition-colors duration-300 ${
              trueMind ? 'border-ember bg-ember-deep/40 shadow-ember-glow' : 'border-ash bg-abyss'
            }`}
          >
            <motion.span
              initial={false}
              animate={{ x: trueMind ? 19 : 3 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`absolute top-[4px] h-3.5 w-3.5 ${trueMind ? 'bg-ember' : 'bg-stone'}`}
            />
          </span>
          <span className="font-ui text-xs text-faded text-left">
            <span className={trueMind ? 'text-glow-ember' : 'text-bone-dim'}>True Mind</span>
            {' '}&middot; narrate through thy attuned key &mdash; sends only lift numbers, never thy name
          </span>
        </button>
      )}
    </div>
  )
}
