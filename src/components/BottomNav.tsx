import { motion, AnimatePresence } from 'framer-motion'
import { useSound } from '../ui/sound'

export type TabId = 'sanctum' | 'combat' | 'rations' | 'keeper' | 'codex'

/* ---------- minimalist sigils, stroke-based ---------- */
const I = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const BonfireIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" {...I}>
    {/* crossed logs */}
    <path d="M4 20 L20 16.5 M4 16.5 L20 20" />
    {/* coiled flame */}
    <path d="M12 14.5 C9.6 13.4 9 11.4 10 9.6 C10.6 10.6 11.4 11 11.4 11 C10.8 8.6 11.6 6.4 13.4 5 C13 7.2 14.6 8.2 14.9 10.2 C15.2 12.2 14 13.9 12 14.5 Z" />
  </svg>
)

const SwordsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" {...I}>
    <path d="M5 4 L15.5 14.5 M5 4 L5 7.5 M5 4 L8.5 4" />
    <path d="M19 4 L8.5 14.5 M19 4 L19 7.5 M19 4 L15.5 4" />
    <path d="M6.5 16.5 L9.5 19.5 M4.5 18.5 L7.5 21.5 M17.5 16.5 L14.5 19.5 M19.5 18.5 L16.5 21.5" />
  </svg>
)

const FlaskIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" {...I}>
    <path d="M10 3 L14 3 M10.5 3 L10.5 7.2 C7.8 8.4 6.5 10.6 6.5 13.5 A5.5 5.5 0 0 0 17.5 13.5 C17.5 10.6 16.2 8.4 13.5 7.2 L13.5 3" />
    <path d="M7.5 13 C9 14.4 15 14.4 16.5 13" />
  </svg>
)

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" {...I}>
    <path d="M12 3 C13 6.2 16.5 8 16.5 12.5 A4.5 4.5 0 0 1 7.5 12.5 C7.5 10 9 8.8 9.6 6.6 C10.4 8 11.5 8.4 11.5 10 C12.6 8.6 12.4 5.8 12 3 Z" />
    <path d="M12 21 A2.6 2.6 0 0 1 9.4 18.2 C9.6 16.8 11 16.4 12 15.2 C13 16.4 14.4 16.8 14.6 18.2 A2.6 2.6 0 0 1 12 21 Z" />
  </svg>
)

const BookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" {...I}>
    <path d="M5 4 C7.5 3 10 3.2 12 4.5 C14 3.2 16.5 3 19 4 L19 19 C16.5 18 14 18.2 12 19.5 C10 18.2 7.5 18 5 19 Z" />
    <path d="M12 4.5 L12 19.5" />
  </svg>
)

const TABS: { id: TabId; label: string; Icon: () => React.ReactElement }[] = [
  { id: 'sanctum', label: 'Sanctum', Icon: BonfireIcon },
  { id: 'combat', label: 'Combat', Icon: SwordsIcon },
  { id: 'rations', label: 'Rations', Icon: FlaskIcon },
  { id: 'keeper', label: 'Keeper', Icon: FlameIcon },
  { id: 'codex', label: 'Codex', Icon: BookIcon },
]

/* ================================================================
   BOTTOM TAB BAR — glass over the void, gold seam on top
   ================================================================ */
export default function BottomNav({
  tab,
  onChange,
}: {
  tab: TabId
  onChange: (t: TabId) => void
}) {
  const { shing } = useSound()
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[55] border-t border-souls-dim/40 bg-void/65 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="primary"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-5">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => {
                if (id !== tab) shing()
                onChange(id)
              }}
              aria-current={active ? 'page' : undefined}
              /* the visible text label only mounts while active — screen readers
                 need a constant name for the other four */
              aria-label={label}
              className="flex flex-col items-center justify-center min-h-16 gap-1 select-none"
            >
              <motion.span
                animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                className={
                  active
                    ? 'text-ember drop-shadow-[0_0_9px_rgba(255,117,24,0.85)]'
                    : 'text-bone-dim'
                }
              >
                <Icon />
              </motion.span>
              <AnimatePresence>
                {active && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 2, transition: { duration: 0.15 } }}
                    className="font-display text-[0.55rem] tracking-[0.2em] uppercase text-ember"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
