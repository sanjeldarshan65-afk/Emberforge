import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { levelInfo } from '../state/store'
import type { BattleReward } from '../state/store'
import { rankForLevel } from '../state/ranks'
import type { ScrollData } from './VictoryScroll'
import { getItem } from '../state/items'
import type { Rarity } from '../state/items'

/* ================================================================
   VICTORY OVERLAY — the boss-kill moment. Fires the instant a
   battle ends: a flash, a gold banner, an XP bar that fills from
   the night's tonnage, a LEVEL-UP flare, and the spoils.
   ================================================================ */

export type Victory = {
  reward: BattleReward
  tonnage: number
  xpBefore: number
  xpAfter: number
  share?: ScrollData // present only when a record fell
}

const asPct = (into: number, needed: number) =>
  Math.max(0, Math.min(100, (into / needed) * 100))

const RARITY_COLOR: Record<Rarity, string> = {
  legendary: 'var(--color-souls)',
  rare: 'var(--color-humanity)',
  uncommon: 'var(--color-verdant)',
  common: 'var(--color-bone-dim)',
}

function Spoil({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-3">
      <div className="stat-souls text-2xl leading-none">{value}</div>
      <div className="font-ui text-[0.65rem] text-bone-dim mt-1">{label}</div>
    </div>
  )
}

function VictoryInner({
  victory,
  line,
  units,
  onClose,
  onShare,
}: {
  victory: Victory
  line: string
  units: string
  onClose: () => void
  onShare: (d: ScrollData) => void
}) {
  const { reward, tonnage, xpBefore, xpAfter, share } = victory
  const before = levelInfo(xpBefore)
  const after = levelInfo(xpAfter)
  const leveledUp = reward.leveledUp
  /* a level-up may also cross a rank threshold — that deserves its own flare */
  const rankAfter = rankForLevel(after.level)
  const rankedUp = leveledUp && rankForLevel(before.level).key !== rankAfter.key
  const startPct = leveledUp ? 0 : asPct(before.into, before.needed)
  const endPct = asPct(after.into, after.needed)
  const banner = reward.prBroken ? 'THE IRON YIELDS' : 'GREAT ENEMY FELLED'

  const [barPct, setBarPct] = useState(startPct)
  const [showLevel, setShowLevel] = useState(!leveledUp)

  useEffect(() => {
    const grow = window.setTimeout(() => setBarPct(endPct), 700)
    const flare = leveledUp ? window.setTimeout(() => setShowLevel(true), 520) : undefined
    return () => {
      window.clearTimeout(grow)
      if (flare) window.clearTimeout(flare)
    }
  }, [endPct, leveledUp])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[68] flex items-center justify-center px-6 bg-black/80 backdrop-blur-sm"
    >
      {/* opening flash — a spark of the felled foe's fire */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0.85 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        style={{ background: 'radial-gradient(circle at 50% 42%, rgba(255,200,120,0.9), transparent 70%)' }}
      />

      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.5, ease: 'easeOut' } }}
        className="relative w-full max-w-md text-center"
      >
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.25, duration: 0.7, ease: 'easeOut' } }}
          className="font-display font-bold text-souls text-3xl sm:text-4xl leading-tight tracking-[0.16em] mb-2 drop-shadow-[0_0_26px_rgba(230,195,92,0.5)]"
        >
          {banner}
        </motion.h2>
        <p className="font-display text-bone-dim text-[0.65rem] tracking-[0.3em] uppercase mb-8">
          {reward.movement} felled
        </p>

        {/* XP bar — fills from the night's tonnage */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">
              Level {showLevel ? after.level : before.level}
            </span>
            <AnimatePresence>
              {leveledUp && showLevel && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-glow-ember animate-flicker"
                >
                  &#10022; LEVEL UP
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="h-2.5 bg-abyss border border-ash overflow-hidden">
            <motion.div
              initial={{ width: `${startPct}%` }}
              animate={{ width: `${barPct}%` }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-ember-deep via-ember to-souls"
            />
          </div>
          <div className="font-ui text-[0.65rem] text-faded mt-1.5 text-right">
            {after.into} / {after.needed} XP &middot; +{reward.xp} earned
          </div>
        </div>

        {/* spoils */}
        <div className="grid grid-cols-2 gap-3">
          <Spoil label="Souls Earned" value={`+${reward.souls.toLocaleString()}`} />
          <Spoil label={`Tonnage · ${units}`} value={tonnage.toLocaleString()} />
        </div>

        {rankedUp && showLevel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { delay: 0.45, duration: 0.5 } }}
            className="inline-flex items-center gap-2 px-4 py-2 border bg-iron mt-1 mb-2"
            style={{ borderColor: rankAfter.color, boxShadow: `0 0 16px ${rankAfter.color}55` }}
          >
            <span className="text-lg leading-none" style={{ color: rankAfter.color }}>
              {rankAfter.glyph}
            </span>
            <span className="text-left">
              <span className="block font-display text-[0.55rem] tracking-[0.25em] uppercase text-bone-dim">
                Rank Attained
              </span>
              <span
                className="block font-display text-sm tracking-[0.15em] uppercase"
                style={{ color: rankAfter.color }}
              >
                {rankAfter.name}
              </span>
            </span>
          </motion.div>
        )}

        {reward.ascended && (
          <div className="font-display text-souls text-[0.6rem] tracking-[0.25em] uppercase mt-3 animate-flicker">
            &#9788; Ascension &middot; Souls &times;1.2
          </div>
        )}
        {reward.prBroken && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.6 } }}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-souls bg-iron shadow-souls-glow mt-3"
          >
            <span className="text-souls leading-none">&#9670;</span>
            <span className="font-display text-[0.6rem] tracking-[0.2em] uppercase text-souls">
              New Personal Record
            </span>
          </motion.div>
        )}

        {reward.drops.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.7 } }}
            className="mt-4 border-t border-ash pt-3"
          >
            <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim mb-2">
              Spoils Claimed
            </div>
            <div className="space-y-1.5">
              {reward.drops.map((id) => {
                const item = getItem(id)
                if (!item) return null
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 bg-iron border"
                    style={{ borderColor: RARITY_COLOR[item.rarity] }}
                  >
                    <span className="font-display text-sm tracking-wide" style={{ color: RARITY_COLOR[item.rarity] }}>
                      &#10022; {item.name}
                    </span>
                    <span className="font-ui text-[0.55rem] tracking-[0.2em] uppercase text-faded">
                      {item.rarity}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        <p className="font-ui text-xs text-faded italic mt-5 mb-5">{line}</p>

        <div className="flex gap-3">
          {share && (
            <button onClick={() => onShare(share)} className="btn-hollow flex-1 min-h-12">
              Share to Realm
            </button>
          )}
          <button onClick={onClose} className="btn-ember flex-1 min-h-12">
            Claim Rewards
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function VictoryOverlay({
  victory,
  line,
  units,
  onClose,
  onShare,
}: {
  victory: Victory | null
  line: string
  units: string
  onClose: () => void
  onShare: (d: ScrollData) => void
}) {
  return (
    <AnimatePresence>
      {victory && (
        <VictoryInner
          key="victory"
          victory={victory}
          line={line}
          units={units}
          onClose={onClose}
          onShare={onShare}
        />
      )}
    </AnimatePresence>
  )
}
