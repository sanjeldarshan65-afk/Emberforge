import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGame, levelInfo, statusEffects } from '../state/store'
import { questRows, macroDaysMet } from '../state/quests'
import type { QuestContext } from '../state/quests'
import { getItem } from '../state/items'

/* ================================================================
   TRIALS — the single most relevant Covenant, surfaced at the top of
   the Sanctum instead of buried near the bottom. Same data, same
   claim path (`claimQuest`) as the full Covenants list — this is
   only a spotlight on the one that matters right now.
   ================================================================ */

export default function TrialsHero({ onOpenAll }: { onOpenAll: () => void }) {
  const xp = useGame((s) => s.xp)
  const prs = useGame((s) => s.prs)
  const battles = useGame((s) => s.battles)
  const rations = useGame((s) => s.rations)
  const macroGoals = useGame((s) => s.macroGoals)
  const vitals = useGame((s) => s.vitals)
  const claimedQuests = useGame((s) => s.claimedQuests)
  const claimQuest = useGame((s) => s.claimQuest)

  const ctx: QuestContext = useMemo(
    () => ({
      level: levelInfo(xp).level,
      battleCount: battles.length,
      streak: statusEffects(battles).streak,
      prs,
      macroDays: macroDaysMet(rations, macroGoals.calories),
      taperRatio: vitals.waist > 0 ? vitals.shoulders / vitals.waist : 0,
    }),
    [xp, prs, battles, rations, macroGoals, vitals]
  )

  const rows = useMemo(() => questRows(ctx, claimedQuests), [ctx, claimedQuests])
  const featured = rows.find((r) => !r.claimed)

  if (!featured) {
    return (
      <div className="panel panel-ornate p-5 text-center">
        <div className="font-display text-souls-dim text-[0.6rem] tracking-[0.25em] uppercase mb-1">
          Trials
        </div>
        <p className="font-body italic text-bone-dim text-sm">
          Every covenant sworn and sealed. The Fire Keeper has nothing left to ask of thee&nbsp;—
          for now.
        </p>
      </div>
    )
  }

  const { q, progress, target, complete, pct } = featured
  const rewardItem = q.itemReward ? getItem(q.itemReward) : undefined
  const fmtNum = (n: number) => (q.objective.kind === 'goldenTaper' ? n.toFixed(3) : String(Math.floor(n)))

  return (
    <motion.div
      className="panel panel-ornate p-5"
      style={{ borderColor: complete ? 'var(--color-souls)' : undefined }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <div className="font-display text-souls-dim text-[0.6rem] tracking-[0.25em] uppercase">
          {complete ? 'Trial Complete' : 'Trial'}
        </div>
        <span className="font-ui text-[0.55rem] tracking-[0.2em] uppercase text-bone-dim">
          {q.category}
        </span>
      </div>

      <h3 className="font-display text-bone text-base tracking-[0.1em] uppercase mb-1">{q.name}</h3>
      <p className="font-body italic text-bone-dim text-sm leading-snug mb-4">{q.lore}</p>

      <div className="h-2 bg-abyss border border-ash overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-ember-deep via-ember to-souls"
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 mb-4">
        <span className="font-ui text-[0.65rem] text-faded">
          {fmtNum(Math.min(progress, target))} / {fmtNum(target)} {q.unit}
        </span>
        <span className="font-ui text-[0.65rem] text-souls-dim">
          &#9737; {q.souls.toLocaleString()}
          {rewardItem && <> &middot; {rewardItem.name}</>}
        </span>
      </div>

      {complete ? (
        <button
          onClick={() => claimQuest(q.id, q.souls, q.itemReward)}
          className="btn-ember w-full min-h-11 text-[0.65rem]"
        >
          Claim the Covenant
        </button>
      ) : (
        <button
          onClick={onOpenAll}
          className="w-full min-h-11 border border-souls-dim/40 text-souls-dim hover:text-souls hover:border-souls-dim font-display text-[0.6rem] tracking-[0.2em] uppercase transition-colors"
        >
          View Trial
        </button>
      )}
    </motion.div>
  )
}
