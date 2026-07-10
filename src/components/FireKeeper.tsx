import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../state/store'
import { seekGuidance } from '../ai/fireKeeper'
import type { KeeperContext } from '../ai/fireKeeper'
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

  const [messages, setMessages] = useState<string[]>(() => [pick(KEEPER_GREETINGS)])
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, thinking])

  const consult = async () => {
    if (thinking) return
    setThinking(true)
    const ctx: KeeperContext = {
      battles,
      prs,
      vitals,
      taperRatio: vitals.shoulders / vitals.waist,
      taperGoal,
    }
    try {
      const reply = await seekGuidance(ctx)
      setMessages((m) => [...m, reply])
    } catch {
      setMessages((m) => [
        ...m,
        'The flame gutters... I cannot see clearly. (The oracle failed — if a local model is connected, check that it still burns.)',
      ])
    } finally {
      setThinking(false)
    }
  }

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

      {/* ---- seek guidance ---- */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={consult}
        disabled={thinking}
        className="btn-ember animate-ember-pulse w-full min-h-14 text-sm"
      >
        {thinking ? 'The Flame Considers...' : 'Seek Guidance'}
      </motion.button>

      <p className="text-center font-ui text-xs text-faded">
        The keeper reads thy Recent Battles and Golden Taper from the ledger.
        {' '}One day, a true mind shall burn behind her eyes.
      </p>
    </div>
  )
}
