import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame, statusEffects } from '../state/store'
import { CONSTELLATION, nodeAvailable, constellationEffects } from '../state/constellation'
import type { ConstellationNode } from '../state/constellation'
import { useModalDismiss } from '../ui/useModalDismiss'

/* ================================================================
   THE CONSTELLATION — a fixed, tiered star-map (three branches, each
   a chain of three nodes). Spend souls to kindle a star; its perk is
   summed with thy relics and applied in the same souls / XP / recovery
   paths. A tiered map reads far better on a phone than a pan-zoom canvas.
   ================================================================ */

const BRANCHES = [
  { key: 'Ember', title: 'Ember', sub: 'Avarice', glyph: '◈' }, // ◈
  { key: 'Mind', title: 'Mind', sub: 'Cunning', glyph: '✦' }, // ✦
  { key: 'Flesh', title: 'Flesh', sub: 'Endurance', glyph: '❋' }, // ❋
] as const

const perkLabel = (p: ConstellationNode['perk']) =>
  p.kind === 'soulsMultiplier'
    ? `+${p.value}% Souls`
    : p.kind === 'xpBonus'
      ? `+${p.value}% XP`
      : `+${p.value}% Recovery`

export default function Constellation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const souls = useGame((s) => s.souls)
  const unlockedNodes = useGame((s) => s.unlockedNodes)
  const unlockNode = useGame((s) => s.unlockNode)
  const manualHollow = useGame((s) => s.settings.hollowed)
  const battles = useGame((s) => s.battles)
  const hollowed = manualHollow || statusEffects(battles).cursed
  useModalDismiss(open, onClose)

  const unlocked = useMemo(() => new Set(unlockedNodes), [unlockedNodes])
  const totals = useMemo(() => constellationEffects(unlocked), [unlocked])
  const accent = hollowed ? 'var(--color-humanity)' : 'var(--color-souls)'

  const [flash, setFlash] = useState<string | null>(null)
  const anyBonus = totals.soulsPct || totals.xpPct || totals.recoveryPct

  const attune = (n: ConstellationNode) => {
    if (unlockNode(n.id, n.cost)) {
      setFlash(n.id)
      setTimeout(() => setFlash((f) => (f === n.id ? null : f)), 900)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[64] bg-black/85 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="The Constellation"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
            className="min-h-screen max-w-2xl mx-auto px-4 pb-32"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="divider-ornate flex-1">The Constellation</div>
              <button
                onClick={onClose}
                aria-label="close the constellation"
                className="ml-3 min-h-10 min-w-10 shrink-0 inline-flex items-center justify-center text-bone-dim hover:text-souls transition-colors"
              >
                &times;
              </button>
            </div>
            <p className="font-body italic text-faded text-sm mb-3">
              Spend the souls of the fallen to kindle the stars. Each burns forever, and its gift is
              thine in every battle to come.
            </p>

            <div className="flex items-center justify-between panel p-3 mb-5">
              <div>
                <div className="font-ui text-[0.55rem] tracking-[0.2em] uppercase text-faded">
                  Souls at hand
                </div>
                <div className="stat-souls text-xl leading-none mt-0.5">
                  &#9737; {souls.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-ui text-[0.55rem] tracking-[0.2em] uppercase text-faded">
                  Attunements
                </div>
                <div className="font-display text-[0.7rem] text-souls-dim mt-1" style={{ color: accent }}>
                  {anyBonus
                    ? [
                        totals.soulsPct ? `+${totals.soulsPct}% souls` : '',
                        totals.xpPct ? `+${totals.xpPct}% xp` : '',
                        totals.recoveryPct ? `+${totals.recoveryPct}% recovery` : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : 'none yet'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {BRANCHES.map((br) => {
                const nodes = CONSTELLATION.filter((n) => n.branch === br.key).sort(
                  (a, b) => a.tier - b.tier
                )
                return (
                  <div key={br.key} className="flex flex-col items-center">
                    <div className="text-center mb-3">
                      <div
                        className="font-display text-xs tracking-[0.2em] uppercase"
                        style={{ color: accent }}
                      >
                        {br.title}
                      </div>
                      <div className="font-ui text-[0.5rem] text-faded tracking-[0.15em] uppercase">
                        {br.sub}
                      </div>
                    </div>

                    {nodes.map((n, i) => {
                      const isUnlocked = unlocked.has(n.id)
                      const avail = nodeAvailable(n, unlocked)
                      const affordable = souls >= n.cost
                      const state = isUnlocked ? 'attuned' : avail ? 'available' : 'locked'
                      const prevUnlocked = i > 0 && unlocked.has(nodes[i - 1].id)
                      const emblemColor =
                        state === 'attuned'
                          ? accent
                          : state === 'available'
                            ? 'var(--color-souls-dim)'
                            : 'var(--color-ash)'
                      return (
                        <div key={n.id} className="flex flex-col items-center w-full">
                          {i > 0 && (
                            <div
                              className="w-px h-6 my-1 transition-colors"
                              style={{ background: prevUnlocked ? accent : 'var(--color-ash)' }}
                            />
                          )}
                          <button
                            onClick={() => attune(n)}
                            disabled={state !== 'available' || !affordable}
                            aria-label={`${n.name}: ${perkLabel(n.perk)}`}
                            className={`w-full flex flex-col items-center text-center px-1 py-2 rounded transition-opacity ${
                              state === 'locked' ? 'opacity-45' : ''
                            } ${state === 'available' && affordable ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
                          >
                            <motion.div
                              animate={
                                flash === n.id
                                  ? { scale: [1, 1.3, 1], transition: { duration: 0.7 } }
                                  : { scale: 1 }
                              }
                              className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-1.5"
                              style={{
                                borderColor: emblemColor,
                                color: emblemColor,
                                background:
                                  state === 'attuned'
                                    ? `radial-gradient(circle, ${accent}33, transparent 70%)`
                                    : 'transparent',
                                boxShadow:
                                  state === 'attuned' ? `0 0 14px ${accent}66` : 'none',
                              }}
                            >
                              <span className="text-lg leading-none">{br.glyph}</span>
                            </motion.div>
                            <div className="font-display text-[0.6rem] leading-tight tracking-wide text-bone">
                              {n.name}
                            </div>
                            <div className="font-ui text-[0.55rem] mt-0.5" style={{ color: emblemColor }}>
                              {perkLabel(n.perk)}
                            </div>
                            <div className="font-ui text-[0.55rem] mt-1 leading-tight">
                              {state === 'attuned' ? (
                                <span style={{ color: accent }}>&#10003; Attuned</span>
                              ) : state === 'locked' ? (
                                <span className="text-faded">Sealed above</span>
                              ) : affordable ? (
                                <span style={{ color: accent }}>Kindle &#183; &#9737;{n.cost}</span>
                              ) : (
                                <span className="text-faded">
                                  &#9737;{n.cost}
                                  <br />
                                  <span className="text-[0.5rem]">
                                    need {(n.cost - souls).toLocaleString()} more
                                  </span>
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            <p className="font-body italic text-faded text-xs text-center mt-8">
              &ldquo;The fire is kindled star by star. What is burned into the sky cannot be unmade.&rdquo;
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
