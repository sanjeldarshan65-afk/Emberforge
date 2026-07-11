import { motion } from 'framer-motion'
import { useGame } from '../state/store'
import type { TabId } from './BottomNav'

/* ================================================================
   THE KINDLING — the Welcome Rite. Not a passive checklist: a
   sequential guided tour of the core loop (battle → daily ember →
   rations → the scale), where each step carries a button that takes
   the new ashen one exactly where the deed is done. Fulfilling all
   four earns a claimable boon; claiming retires the rite forever.
   ================================================================ */

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

const WELCOME_RITE_ID = 'welcome-rite'
const WELCOME_RITE_SOULS = 500

const navigate = (tab: TabId) =>
  window.dispatchEvent(new CustomEvent<TabId>('emberforge:navigate', { detail: tab }))

type Step = {
  done: boolean
  label: string
  charge: string // what to do, in the forge voice
  boon: string // what it awakens
  action?: { label: string; go: () => void }
}

export default function Kindling() {
  const battles = useGame((s) => s.battles)
  const rations = useGame((s) => s.rations)
  const weighIns = useGame((s) => s.weighIns)
  const claimedDailies = useGame((s) => s.claimedDailies)
  const claimedQuests = useGame((s) => s.claimedQuests)
  const claimQuest = useGame((s) => s.claimQuest)

  /* the rite retires once its boon is claimed */
  if (claimedQuests.includes(WELCOME_RITE_ID)) return null

  const steps: Step[] = [
    {
      done: battles.length >= 1,
      label: 'Strike thy first blow',
      charge: 'Descend to the Combat Log and log a real set — any lift, any weight.',
      boon: 'souls & XP begin to flow; the Chronicle starts to fill',
      action: { label: 'To the Combat Log', go: () => navigate('combat') },
    },
    {
      done: claimedDailies.length >= 1,
      label: 'Claim a Daily Ember',
      charge: 'One small trial kindles each dawn at the top of this Sanctum. Fulfil it, then claim.',
      boon: 'the daily rhythm — the reason to return tomorrow',
      action: {
        label: 'See today’s Ember',
        go: () => {
          navigate('sanctum')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        },
      },
    },
    {
      done: rations.length >= 1,
      label: 'Feed the vessel',
      charge: 'Log a meal in the Rations — the body is built at the table too.',
      boon: 'macro tracking wakes; the Covenant of the Flesh opens',
      action: { label: 'To the Rations', go: () => navigate('rations') },
    },
    {
      done: weighIns.length >= 1,
      label: 'Face the scale',
      charge: 'Amend thy measurements on the Character Sheet below and seal the record.',
      boon: 'the Vessel’s Burden begins its ledger',
    },
  ]

  const lit = steps.filter((s) => s.done).length
  const allDone = lit === steps.length
  const activeIdx = steps.findIndex((s) => !s.done)
  const pct = Math.round((lit / steps.length) * 100)
  const fresh = battles.length === 0

  return (
    <motion.section variants={fadeUp}>
      <div className="divider-ornate mb-4">The Welcome Rite</div>
      <div
        className="panel panel-ornate p-5"
        style={{ borderColor: allDone ? 'var(--color-souls)' : undefined }}
      >
        <p className="font-body italic text-bone-dim text-sm mb-4 leading-snug">
          {allDone
            ? 'The rite is fulfilled. Take up thy boon, ashen one — the forge is thine now.'
            : fresh
              ? 'Welcome, Unkindled. Four small deeds teach thee the whole forge — take them in order, and a boon waits at the end.'
              : 'The fire catches. Finish the rite, and claim what is owed.'}
        </p>

        <div className="flex items-center justify-between mb-1.5">
          <span className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">
            {lit} of {steps.length} deeds done
          </span>
          <span className="font-ui text-[0.65rem] text-souls-dim">
            boon &middot; &#9737; {WELCOME_RITE_SOULS}
          </span>
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

        <ol className="space-y-3">
          {steps.map((s, i) => {
            const active = i === activeIdx
            return (
              <li
                key={i}
                className={`flex items-start gap-3 ${!s.done && !active ? 'opacity-50' : ''}`}
              >
                <span
                  className={`mt-px text-base leading-none ${
                    s.done ? 'text-glow-ember' : active ? 'text-ember animate-flicker' : 'text-faded'
                  }`}
                  aria-hidden
                >
                  {s.done ? '◆' : '◇'}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-display text-[0.72rem] tracking-wide ${
                      s.done ? 'text-bone' : active ? 'text-bone' : 'text-bone-dim'
                    }`}
                  >
                    {s.label}
                    {s.done && (
                      <span className="font-display text-[0.55rem] tracking-[0.2em] uppercase text-souls-dim ml-2">
                        done
                      </span>
                    )}
                  </div>
                  {active && !s.done && (
                    <>
                      <p className="font-body italic text-bone-dim text-[0.8rem] leading-snug mt-0.5">
                        {s.charge}
                      </p>
                      <div className="font-ui text-[0.62rem] text-faded mt-0.5">→ {s.boon}</div>
                      {s.action && (
                        <button
                          onClick={s.action.go}
                          className="btn-ember min-h-10 px-4 text-[0.6rem] mt-2"
                        >
                          {s.action.label}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {allDone && (
          <button
            onClick={() => claimQuest(WELCOME_RITE_ID, WELCOME_RITE_SOULS)}
            className="btn-ember w-full min-h-12 mt-5"
          >
            Claim the Boon &middot; &#9737; {WELCOME_RITE_SOULS}
          </button>
        )}
      </div>
    </motion.section>
  )
}
