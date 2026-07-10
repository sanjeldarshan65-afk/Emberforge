import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../state/store'
import { currentSeason, seasonReps, daysLeft } from '../state/season'

/* ================================================================
   THE RITE OF THE SEASON — a quarterly, time-boxed trial. This app
   keeps no server and pools no data across ashen ones (the title
   screen says as much), so the bar below tracks THY reps this
   season, honestly — not an invented global counter.
   ================================================================ */

export default function SeasonalTrial() {
  const battles = useGame((s) => s.battles)
  const claimedSeasons = useGame((s) => s.claimedSeasons)
  const claimSeason = useGame((s) => s.claimSeason)

  const season = useMemo(() => currentSeason(), [])
  const reps = useMemo(() => seasonReps(battles, season), [battles, season])
  const left = useMemo(() => daysLeft(season), [season])
  const pct = Math.max(0, Math.min(100, (reps / season.target) * 100))
  const complete = reps >= season.target
  const claimed = claimedSeasons.includes(season.id)

  return (
    <motion.div className="panel panel-ornate p-5" style={{ borderColor: complete && !claimed ? 'var(--color-souls)' : undefined }}>
      <div className="flex items-baseline justify-between mb-1">
        <div className="font-display text-souls-dim text-[0.6rem] tracking-[0.25em] uppercase">
          Rite of the Season
        </div>
        <span className="font-ui text-[0.6rem] text-bone-dim">
          {left > 0 ? `${left} day${left === 1 ? '' : 's'} left` : 'the rite closes'}
        </span>
      </div>

      <h3 className="font-display text-bone text-base tracking-[0.1em] uppercase mb-1">{season.name}</h3>
      <p className="font-body italic text-bone-dim text-sm leading-snug mb-1">{season.tagline}</p>
      <p className="font-body italic text-faded text-xs leading-snug mb-4">
        Countless ashen ones tend their own flames alongside thee, each keeping their own ledger.
      </p>

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
          {reps.toLocaleString()} / {season.target.toLocaleString()} reps
        </span>
        <span className="font-ui text-[0.65rem] text-souls-dim">
          &#9737; {season.souls.toLocaleString()}
        </span>
      </div>

      {claimed ? (
        <div className="flex items-center justify-center gap-2 font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim min-h-11">
          <span className="text-souls">&#10003;</span> Rite Fulfilled
        </div>
      ) : complete ? (
        <button
          onClick={() => claimSeason(season.id, season.souls)}
          className="btn-ember w-full min-h-11 text-[0.65rem]"
        >
          Claim the Rite
        </button>
      ) : (
        <div className="text-center font-display text-[0.55rem] tracking-[0.25em] uppercase text-faded min-h-11 flex items-center justify-center">
          {Math.floor(pct)}% &middot; the season endures
        </div>
      )}
    </motion.div>
  )
}
