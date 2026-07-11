import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EXERCISES, CATEGORIES } from '../state/exercises'
import type { Category, Exercise } from '../state/exercises'
import { riteDetails } from '../state/loreCodex'
import type { Tier } from '../state/loreCodex'
import { useGame } from '../state/store'
import { faceFoe } from '../ui/navigate'
import { useModalDismiss } from '../ui/useModalDismiss'
import RiteMotion from './RiteMotion'

/* ================================================================
   THE CODEX — the exercise library, read from the canonical
   catalog of rites (src/state/exercises.ts). Searchable by name,
   muscle, and region; grouped, sortable, and a launch point into
   the Combat Log ("Face This Foe").
   ================================================================ */

type Entry = Exercise

const CODEX: Entry[] = EXERCISES
const FILTERS: ('All' | Category)[] = ['All', ...CATEGORIES]

/* rank styling — the higher the rite asks, the hotter it burns */
const TIER_CLS: Record<Tier, string> = {
  Novice: 'border-ash text-bone-dim',
  Adept: 'border-souls-dim text-souls',
  Master: 'border-ember/70 text-glow-ember',
}

/* everything a rite can be found by: its name, its category, its display
   muscles ("Triceps", "Front Delts"…), and its heatmap regions. Built once —
   the catalog is static. */
const HAYSTACK = new Map(
  EXERCISES.map((e) => [
    e.name,
    [e.name, e.category, ...e.primary, ...e.secondary, ...e.heat.primary, ...e.heat.secondary]
      .join(' ')
      .toLowerCase(),
  ])
)

const DEBOUNCE_MS = 150

type SortMode = 'group' | 'name' | 'faced'

/* session memory — the codex remembers thy last search, filter, and
   ordering when thou leavest for another tab and returnest */
let sessionQuery = ''
let sessionCat: 'All' | Category = 'All'
let sessionSort: SortMode = 'group'

/* within a group, the great compounds stand first, then the rest by name */
const groupOrder = (a: Entry, b: Entry) =>
  Number(b.compound) - Number(a.compound) || a.name.localeCompare(b.name)

export default function TheCodex() {
  const battles = useGame((s) => s.battles)
  const prs = useGame((s) => s.prs)
  const units = useGame((s) => s.settings.units)

  const [query, setQuery] = useState(() => sessionQuery)
  const [needle, setNeedle] = useState(() => sessionQuery.trim().toLowerCase())
  const [cat, setCat] = useState<'All' | Category>(() => sessionCat)
  const [sort, setSort] = useState<SortMode>(() => sessionSort)
  const [collapsed, setCollapsed] = useState<Set<Category>>(() => new Set())
  const [openEntry, setOpenEntry] = useState<Entry | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const originRef = useRef<HTMLElement | null>(null) // the card that opened the page
  const hadEntry = useRef(false)

  /* Escape closes (top-most only) + the page behind is scroll-locked */
  useModalDismiss(!!openEntry, () => setOpenEntry(null))

  /* focus lives inside the codex page while it is open */
  useEffect(() => {
    if (!openEntry) return
    modalRef.current?.focus()
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Tab') return
      const root = modalRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault()
        last.focus()
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault()
        first.focus()
      } else if (!root.contains(document.activeElement)) {
        ev.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openEntry])

  /* each rite is "unscribed" until its recording actually loads */
  useEffect(() => setVideoReady(false), [openEntry])

  /* debounce the keystrokes into the working needle */
  useEffect(() => {
    const t = setTimeout(() => setNeedle(query.trim().toLowerCase()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  /* remember search + filter + ordering for the rest of the session */
  useEffect(() => {
    sessionQuery = query
    sessionCat = cat
    sessionSort = sort
  }, [query, cat, sort])

  /* closing a codex page returns focus to the card that opened it
     (falling back to the search field if that card has since vanished) */
  useEffect(() => {
    if (openEntry) hadEntry.current = true
    else if (hadEntry.current) {
      const origin = originRef.current
      if (origin && document.contains(origin)) origin.focus()
      else searchRef.current?.focus()
    }
  }, [openEntry])

  /* how often each foe has been faced — for the "most faced" ordering */
  const faced = useMemo(() => {
    const m = new Map<string, number>()
    for (const b of battles) m.set(b.movement, (m.get(b.movement) ?? 0) + 1)
    return m
  }, [battles])

  /* case-insensitive partial match against name, category, muscles, and
     heat regions — the category filter always stacks on top */
  const visible = useMemo(
    () =>
      CODEX.filter(
        (e) =>
          (cat === 'All' || e.category === cat) &&
          (!needle || (HAYSTACK.get(e.name) ?? '').includes(needle))
      ),
    [needle, cat]
  )

  /* how many rites each tab would show under the current search */
  const counts = useMemo(() => {
    const m = new Map<'All' | Category, number>()
    let all = 0
    for (const e of CODEX) {
      if (needle && !(HAYSTACK.get(e.name) ?? '').includes(needle)) continue
      all++
      m.set(e.category, (m.get(e.category) ?? 0) + 1)
    }
    m.set('All', all)
    return m
  }, [needle])

  /* the flat orderings; the grouped ordering is rendered per-section */
  const flat = useMemo(() => {
    if (sort === 'name') return [...visible].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'faced')
      return [...visible].sort(
        (a, b) => (faced.get(b.name) ?? 0) - (faced.get(a.name) ?? 0) || a.name.localeCompare(b.name)
      )
    return visible
  }, [visible, sort, faced])

  /* the ashen one's history with a foe, read from the ledger */
  const history = useMemo(() => {
    if (!openEntry) return null
    const list = battles.filter((b) => b.movement === openEntry.name) // newest first
    if (list.length === 0 && !(prs[openEntry.name] > 0)) return null
    return {
      pr: prs[openEntry.name] ?? Math.max(0, ...list.map((b) => b.topWeight)),
      bestE1rm: list.length ? Math.max(...list.map((b) => b.e1rm)) : 0, // same epley-fed e1rm the Sanctum shows
      last: list[0]?.date,
      sets: list.reduce((t, b) => t + b.sets.length, 0),
      battles: list.length,
    }
  }, [openEntry, battles, prs])

  const toggleGroup = (c: Category) =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })

  const throwGauntlet = (name: string) => {
    setOpenEntry(null)
    faceFoe(name)
  }

  /* ---- one grid card ---- */
  const Card = ({ e }: { e: Entry }) => (
    <motion.button
      layout
      key={e.name}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      onClick={(ev) => {
        originRef.current = ev.currentTarget as HTMLElement
        setOpenEntry(e)
      }}
      aria-label={`${e.name}, ${e.category}${e.compound ? ', great compound' : ''}, kindles ${e.heat.primary.join(' and ')} — open its codex page`}
      className="panel p-4 text-left min-h-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-souls-dim"
    >
      <div className="font-display text-bone text-sm tracking-wider" aria-hidden>
        {e.name}
        {e.compound && (
          <span className="ml-1.5 text-[0.5rem] tracking-[0.2em] text-souls-dim align-middle">
            &#9670;
          </span>
        )}
      </div>
      <div className="font-ui text-[0.65rem] text-faded mt-1" aria-hidden>
        {e.category}
        {sort === 'faced' && (faced.get(e.name) ?? 0) > 0 && (
          <span className="text-souls-dim"> &middot; faced {faced.get(e.name)}</span>
        )}
      </div>
      <div className="flex items-center gap-1 mt-1.5 flex-wrap" aria-hidden>
        {e.heat.primary.map((g) => (
          <span
            key={`p-${g}`}
            className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-ember/60 bg-ember/15 text-ember"
          >
            {g}
          </span>
        ))}
        {e.heat.secondary.map((g) => (
          <span
            key={`s-${g}`}
            className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-stone text-bone-dim"
          >
            {g}
          </span>
        ))}
      </div>
    </motion.button>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="divider-ornate flex-1">The Codex</div>
        <button
          onClick={() => setShowLegend((v) => !v)}
          aria-expanded={showLegend}
          aria-label="what the markings mean"
          className={`min-h-9 min-w-9 shrink-0 border font-display text-xs transition-colors ${
            showLegend
              ? 'border-souls-dim text-souls bg-iron'
              : 'border-ash text-souls-dim hover:text-souls hover:border-souls-dim'
          }`}
        >
          ?
        </button>
      </div>
      <p className="text-bone-dim italic text-sm text-center -mt-1">
        Knowledge of every rite of iron, that none need wander for guidance.
      </p>

      {/* the legend, summoned by the rune above and dismissed at will */}
      <AnimatePresence initial={false}>
        {showLegend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="panel p-3 flex items-start gap-3">
              <p className="font-ui text-[0.68rem] text-bone-dim leading-relaxed flex-1">
                <span className="font-ui text-[0.55rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-ember/60 bg-ember/15 text-ember">
                  Chest
                </span>{' '}
                ember-filled chips mark the muscles a rite kindles hardest;{' '}
                <span className="font-ui text-[0.55rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-stone text-bone-dim">
                  Arms
                </span>{' '}
                outlined chips assist. <span className="text-souls-dim">&#9670;</span> marks a great
                compound, pinned first in its hall.
              </p>
              <button
                onClick={() => setShowLegend(false)}
                aria-label="dismiss the legend"
                className="min-h-8 min-w-8 shrink-0 text-faded hover:text-bone transition-colors"
              >
                &times;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={searchRef}
        type="search"
        placeholder="Search the codex..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input-dark min-h-12"
        aria-label="search exercises by name, muscle, or region"
      />

      {/* category filters */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((c) => {
          const n = counts.get(c) ?? 0
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              aria-label={`${c}: ${n} rite${n === 1 ? '' : 's'}`}
              className={`min-h-9 px-3 font-display text-[0.6rem] tracking-[0.15em] uppercase border transition-colors ${
                cat === c
                  ? 'border-souls-dim text-souls bg-iron'
                  : n === 0
                    ? 'border-ash text-faded opacity-60'
                    : 'border-ash text-bone-dim'
              }`}
            >
              {c}
              <span className={`ml-1 normal-case tracking-normal font-ui ${cat === c ? 'text-souls-dim' : 'text-faded'}`}>
                &middot; {n}
              </span>
            </button>
          )
        })}
      </div>

      {/* ordering */}
      <div className="flex items-center gap-1.5">
        <span className="font-ui text-[0.6rem] text-faded mr-1">order by</span>
        {(
          [
            ['group', 'Muscle'],
            ['name', 'Name'],
            ['faced', 'Most Faced'],
          ] as [SortMode, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSort(id)}
            aria-pressed={sort === id}
            className={`min-h-8 px-2.5 border font-display text-[0.55rem] tracking-[0.15em] uppercase transition-colors ${
              sort === id ? 'border-souls-dim text-souls bg-iron' : 'border-ash text-bone-dim'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---- the list ---- */}
      {sort === 'group' ? (
        (cat === 'All' ? CATEGORIES : [cat as Category]).map((c) => {
          const items = visible.filter((e) => e.category === c).sort(groupOrder)
          if (items.length === 0) return null
          const shut = collapsed.has(c)
          return (
            <section key={c}>
              {/* sticky section header — always know which hall thou walkest */}
              <button
                onClick={() => toggleGroup(c)}
                aria-expanded={!shut}
                className="sticky top-0 z-20 w-full flex items-center justify-between gap-3 bg-void/90 backdrop-blur-md py-2 min-h-10"
              >
                <span className="font-display text-[0.65rem] tracking-[0.25em] uppercase text-souls-dim">
                  {c} <span className="font-ui text-faded normal-case tracking-normal">&middot; {items.length}</span>
                </span>
                <span
                  className={`text-souls-dim transition-transform duration-200 ${shut ? '' : 'rotate-180'}`}
                  aria-hidden
                >
                  &#9662;
                </span>
              </button>
              <AnimatePresence initial={false}>
                {!shut && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2 pt-1 pb-2">
                      {items.map((e) => (
                        <Card key={e.name} e={e} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )
        })
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {flat.map((e) => (
              <Card key={e.name} e={e} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {visible.length === 0 && (
        <div className="panel p-6 text-center">
          <p className="text-bone-dim italic">The codex holds no such rite&hellip;</p>
          <p className="font-ui text-xs text-faded mt-1.5">
            Seek by name, muscle, or region — &ldquo;curl&rdquo;, &ldquo;triceps&rdquo;, &ldquo;legs&rdquo;.
          </p>
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
              ref={modalRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={`${openEntry.name} — codex page`}
              initial={{ scale: 0.93, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { duration: 0.3 } }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="panel panel-ornate w-full max-w-sm p-5 outline-none"
            >
              {/* the rite recording — a looping MP4 once scribed; until then, the
                  Fire Keeper's animated form sketch performs the movement */}
              <div className="relative aspect-video bg-iron border border-ash overflow-hidden mb-4">
                {!videoReady && (
                  <>
                    <RiteMotion name={openEntry.name} />
                    <span className="absolute bottom-1.5 right-2 font-ui text-[0.55rem] tracking-[0.12em] uppercase text-faded">
                      sketched by the Fire Keeper
                    </span>
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

              {/* the implement it demands, and the rank it asks */}
              {(() => {
                const d = riteDetails(openEntry)
                return (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 border border-ash text-faded font-ui text-[0.6rem] tracking-[0.12em] uppercase">
                      &#9874; {d.equipment}
                    </span>
                    <span
                      className={`px-2 py-0.5 border font-display text-[0.6rem] tracking-[0.2em] uppercase ${TIER_CLS[d.tier]}`}
                    >
                      &#9670; {d.tier}
                    </span>
                  </div>
                )
              })()}

              {/* thy history with this foe — the same ledger the Sanctum reads */}
              {history ? (
                <div className="border border-ash bg-charcoal p-3 mt-3">
                  <div className="font-display text-[0.55rem] tracking-[0.25em] uppercase text-souls-dim mb-2">
                    Thy History &middot; {history.battles} battle{history.battles === 1 ? '' : 's'}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-ui text-xs">
                    <div className="text-faded">
                      Record{' '}
                      <span className="stat-souls text-sm">
                        {history.pr > 0 ? `${history.pr} ${units}` : '—'}
                      </span>
                    </div>
                    <div className="text-faded">
                      Best e1RM{' '}
                      <span className="stat-souls text-sm">
                        {history.bestE1rm > 0 ? history.bestE1rm : '—'}
                      </span>
                    </div>
                    <div className="text-faded">
                      Last faced{' '}
                      <span className="text-bone-dim">
                        {history.last
                          ? new Date(history.last).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                    <div className="text-faded">
                      Sets in the ledger <span className="text-bone-dim">{history.sets}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="font-body italic text-faded text-sm mt-3">
                  Thou hast never faced this foe. The iron waits, patient as stone.
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
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
                    className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-ember/60 bg-ember/15 text-ember"
                  >
                    {g}
                  </span>
                ))}
                {openEntry.heat.secondary.map((g) => (
                  <span
                    key={`hs-${g}`}
                    className="font-ui text-[0.5rem] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-stone text-bone-dim"
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

              {/* the mistakes the Fire Keeper has watched hollows repeat for an age */}
              <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-blood-bright mt-5 mb-2">
                Common Faults
              </div>
              <ul className="space-y-2.5">
                {riteDetails(openEntry).faults.map((f, i) => (
                  <li key={i} className="flex gap-2.5 text-bone-dim italic leading-snug text-sm">
                    <span className="text-blood-bright shrink-0">&#10007;</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => throwGauntlet(openEntry.name)}
                className="btn-ember w-full min-h-12 mt-5"
              >
                &#9876; Face This Foe
              </button>
              <button onClick={() => setOpenEntry(null)} className="btn-hollow w-full min-h-11 mt-2">
                Close the Codex
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
