import { motion } from 'framer-motion'
import { useGame, levelInfo, localDayKey } from '../state/store'

/* ================================================================
   THE KINDLING — the first-run roadmap. Several parts of the Sanctum
   only bloom with data (the Souls Ledger wants two days, the Echoes
   heatmap wants weeks). Rather than show a barren screen on day one,
   this panel turns that emptiness into an anticipatory checklist: each
   ember lights as the player returns, naming the boon it unlocks. It
   retires itself once the vessel is established (~a first week).
   ================================================================ */

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

type Ember = { done: boolean; label: string; boon: string }

export default function Kindling() {
  const battles = useGame((s) => s.battles)
  const xp = useGame((s) => s.xp)
  const level = levelInfo(xp).level

  const distinctDays = new Set(battles.map((b) => localDayKey(b.date))).size

  // retire the roadmap once the vessel is established (about a first week of training)
  if (distinctDays >= 5) return null

  const anyPR = battles.some((b) => b.newPR)
  const embers: Ember[] = [
    { done: battles.length >= 1, label: 'Log thy first battle', boon: 'the Chronicle begins to fill' },
    { done: distinctDays >= 2, label: 'Return for a second day', boon: "the Souls Ledger's lines awaken" },
    { done: anyPR, label: 'Shatter thy first record', boon: 'relics begin to fall as spoils' },
    { done: level >= 3, label: 'Rise to Level 3', boon: 'thy first relic is forged' },
    { done: distinctDays >= 4, label: 'Kindle four days of ash', boon: 'the Echoes heatmap takes shape' },
  ]
  const lit = embers.filter((e) => e.done).length
  const pct = Math.round((lit / embers.length) * 100)
  const fresh = battles.length === 0

  return (
    <motion.section variants={fadeUp}>
      <div className="divider-ornate mb-4">The Kindling</div>
      <div className="panel panel-ornate p-5">
        <p className="font-body italic text-bone-dim text-sm mb-4 leading-snug">
          {fresh
            ? 'Welcome, Unkindled. Thy legend is yet unwritten — descend to the Combat Log and strike thy first blow. Each ember below lights as thou dost return, and new powers wake with them.'
            : 'The fire catches. Kindle each ember, and the Sanctum will bloom around thee.'}
        </p>

        <div className="flex items-center justify-between mb-1.5">
          <span className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">
            {lit} of {embers.length} embers kindled
          </span>
          <span className="stat-souls text-sm">{pct}%</span>
        </div>
        <div className="h-2 bg-abyss border border-ash overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="h-full"
            style={{ background: 'linear-gradient(90deg, var(--color-ember-deep), var(--color-ember))' }}
          />
        </div>

        <ul className="space-y-2.5">
          {embers.map((e, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`mt-px text-base leading-none ${e.done ? 'text-glow-ember' : 'text-faded'}`}
                aria-hidden
              >
                {e.done ? '◆' : '◇'}
              </span>
              <div className="flex-1">
                <div
                  className={`font-display text-[0.72rem] tracking-wide ${e.done ? 'text-bone' : 'text-bone-dim'}`}
                >
                  {e.label}
                </div>
                <div className="font-ui text-[0.62rem] text-faded">→ {e.boon}</div>
              </div>
              {e.done && (
                <span className="font-display text-[0.55rem] tracking-[0.2em] uppercase text-souls-dim shrink-0 mt-1">
                  lit
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  )
}
