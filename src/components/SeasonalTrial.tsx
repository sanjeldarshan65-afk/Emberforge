import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../state/store'
import { currentSeason, seasonReps, daysLeft } from '../state/season'

/* ================================================================
   THE RITE OF THE SEASON — a quarterly, time-boxed trial. This app
   keeps no server and pools no data across ashen ones (the title
   screen says as much), so the bar below tracks THY reps this
   season, honestly — not an invented global counter.
   Compact strip by default; it only swells when the rite is won.
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
    <motion.div
      className="panel panel-ornate px-4 py-3"
      style={{ borderColor: complete && !claimed ? 'var(--color-souls)' : undefined }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim">
          Rite of the Season
        </span>
        <span className="font-ui text-[0.6rem] text-bone-dim shrink-0">
          {left > 0 ? `${left} day${left === 1 ? '' : 's'} left` : 'the rite closes'}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-0.5">
        <span className="font-display text-bone text-sm tracking-[0.08em] truncate">
          {season.name}
        </span>
        <span className="font-ui text-[0.65rem] text-souls-dim shrink-0">
          &#9737; {season.souls.toLocaleString()}
        </span>
      </div>

      <div className="h-1 bg-abyss border border-ash overflow-hidden mt-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-ember-deep via-ember to-souls"
        />
      </div>
      <div className="flex items-center justify-between gap-3 mt-1">
        <span className="font-ui text-[0.6rem] text-faded shrink-0">
          {reps.toLocaleString()} / {season.target.toLocaleString()} reps this season
        </span>
        {claimed ? (
          <span className="font-display text-[0.55rem] tracking-[0.2em] uppercase text-souls-dim shrink-0">
            <span className="text-souls">&#10003;</span> rite fulfilled
          </span>
        ) : (
          !complete && (
            <span className="font-ui text-[0.6rem] text-faded italic truncate min-w-0">
              {season.tagline}
            </span>
          )
        )}
      </div>

      {complete && !claimed && (
        <button
          onClick={() => claimSeason(season.id, season.souls)}
          className="btn-ember w-full min-h-11 text-[0.65rem] mt-3"
        >
          Claim the Rite
        </button>
      )}
    </motion.div>
  )
}
