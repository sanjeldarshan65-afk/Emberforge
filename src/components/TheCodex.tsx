import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EXERCISES, CATEGORIES } from '../state/exercises'
import type { Category, Exercise } from '../state/exercises'

/* ================================================================
   THE CODEX — the exercise library, read from the canonical
   catalog of rites (src/state/exercises.ts)
   ================================================================ */

type Entry = Exercise

const CODEX: Entry[] = EXERCISES
const FILTERS: ('All' | Category)[] = ['All', ...CATEGORIES]

export default function TheCodex() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<'All' | Category>('All')
  const [openEntry, setOpenEntry] = useState<Entry | null>(null)
  const [videoReady, setVideoReady] = useState(false)

  /* each rite is "unscribed" until its recording actually loads */
  useEffect(() => setVideoReady(false), [openEntry])

  const visible = useMemo(
    () =>
      CODEX.filter(
        (e) =>
          (cat === 'All' || e.category === cat) &&
          e.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [query, cat]
  )

  return (
    <div className="space-y-5">
      <div className="divider-ornate">The Codex</div>
      <p className="text-bone-dim italic text-sm text-center -mt-1">
        Knowledge of every rite of iron, that none need wander for guidance.
      </p>

      <input
        type="search"
        placeholder="Search the codex..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input-dark min-h-12"
        aria-label="search exercises"
      />

      <p className="font-ui text-[0.58rem] text-faded -mt-2">
        Each rite shows the heatmap regions it kindles — <span className="text-ember">bright</span> is
        primary, faded assists.
      </p>

      {/* category filters */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`min-h-9 px-3 font-display text-[0.6rem] tracking-[0.15em] uppercase border transition-colors ${
              cat === c ? 'border-souls-dim text-souls bg-iron' : 'border-ash text-bone-dim'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* the grid */}
      <div className="grid grid-cols-2 gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((e) => (
            <motion.button
              layout
              key={e.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              onClick={() => setOpenEntry(e)}
              className="panel p-4 text-left min-h-20"
            >
              <div className="font-display text-bone text-sm tracking-wider">
                {e.name}
                {e.compound && (
                  <span className="ml-1.5 text-[0.5rem] tracking-[0.2em] text-souls-dim align-middle">
                    &#9670;
                  </span>
                )}
              </div>
              <div className="font-ui text-[0.65rem] text-faded mt-1">{e.category}</div>
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {e.heat.primary.map((g) => (
                  <span
                    key={`p-${g}`}
                    className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-ember/50 text-ember"
                  >
                    {g}
                  </span>
                ))}
                {e.heat.secondary.map((g) => (
                  <span
                    key={`s-${g}`}
                    className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-ash text-faded"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {visible.length === 0 && (
        <div className="panel p-6 text-center">
          <p className="text-bone-dim italic">No such rite is inscribed here.</p>
        </div>
      )}

      {/* ---- the entry card ---- */}
      <AnimatePresence>
        {openEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenEntry(null)}
            className="fixed inset-0 z-[62] bg-black/75 flex items-center justify-center px-4 py-8 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.93, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { duration: 0.3 } }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="panel panel-ornate w-full max-w-sm p-5"
            >
              {/* the rite recording — a looping MP4 once scribed; dark shimmer skeleton until then */}
              <div className="relative aspect-video bg-iron border border-ash overflow-hidden mb-4">
                {/* dark shimmering skeleton loader — resting state and fallback */}
                {!videoReady && (
                  <>
                    <motion.div
                      aria-hidden
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ duration: 1.7, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-ui text-xs text-faded">rite recording yet to be scribed</span>
                    </div>
                  </>
                )}
                {/* looping demonstration; reveals itself only once a real asset loads */}
                <video
                  key={openEntry.name}
                  src={`/rites/${openEntry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp4`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onLoadedData={() => setVideoReady(true)}
                  onError={() => setVideoReady(false)}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                    videoReady ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </div>

              <h3 className="font-display text-souls text-lg tracking-[0.15em]">{openEntry.name}</h3>

              <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
                {openEntry.primary.map((m) => (
                  <span key={m} className="px-2 py-1 border border-ember/60 text-glow-ember font-ui text-[0.65rem]">
                    {m}
                  </span>
                ))}
                {openEntry.secondary.map((m) => (
                  <span key={m} className="px-2 py-1 border border-ash text-bone-dim font-ui text-[0.65rem]">
                    {m}
                  </span>
                ))}
              </div>

              {/* which regions of the Vessel's heatmap this rite lights */}
              <div className="flex items-center gap-1.5 flex-wrap -mt-2 mb-4">
                <span className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-souls-dim">
                  Kindles
                </span>
                {openEntry.heat.primary.map((g) => (
                  <span
                    key={`hp-${g}`}
                    className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-ember/50 text-ember"
                  >
                    {g}
                  </span>
                ))}
                {openEntry.heat.secondary.map((g) => (
                  <span
                    key={`hs-${g}`}
                    className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-ash text-faded"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim mb-2">
                Form Cues
              </div>
              <ul className="space-y-2.5">
                {openEntry.cues.map((c, i) => (
                  <li key={i} className="flex gap-2.5 text-bone italic leading-snug">
                    <span className="text-souls shrink-0">&#9670;</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>

              <button onClick={() => setOpenEntry(null)} className="btn-hollow w-full min-h-12 mt-5">
                Close the Codex
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
