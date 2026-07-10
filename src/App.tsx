import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import CombatLog from './components/CombatLog'
import RationsTracker from './components/RationsTracker'
import FireKeeper from './components/FireKeeper'
import BottomNav from './components/BottomNav'
import type { TabId } from './components/BottomNav'
import InstallPrompt from './pwa/InstallPrompt'
import Splash from './components/Splash'
import SettingsSheet from './components/SettingsSheet'
import RiteOfEmbers from './components/RiteOfEmbers'
import { SigilWatcher } from './components/SigilVault'
import TheCodex from './components/TheCodex'
import { ToastProvider } from './ui/Toast'
import { useGame, levelInfo, statusEffects } from './state/store'
import { pick, EPIGRAPHS } from './ui/flavor'

/* ---------- animation presets ---------- */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
}
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.22 } },
}

type View = 'title' | 'rite' | 'hub'

/* ================================================================
   TITLE SCREEN — character creation & the bonfire
   ================================================================ */
function TitleScreen({ onRest, onNewLegend }: { onRest: () => void; onNewLegend: () => void }) {
  const profile = useGame((s) => s.profile)
  const setProfile = useGame((s) => s.setProfile)
  const clearProfile = useGame((s) => s.clearProfile)
  const [name, setName] = useState('')
  const [epigraph] = useState(() => pick(EPIGRAPHS))

  const create = () => {
    const n = name.trim()
    if (!n) return
    setProfile(n)
    onNewLegend() // a new legend faces the Rite of Embers
  }

  return (
    <motion.div
      key="title"
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.6, ease: 'easeIn' } }}
      className="min-h-screen flex items-center justify-center px-6"
    >
      <motion.main
        variants={stagger}
        initial="hidden"
        animate="show"
        className="w-full max-w-lg text-center"
      >
        <motion.div variants={fadeUp} className="divider-ornate mb-8">
          A Fire Yet Burns
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-display text-souls text-5xl tracking-[0.2em] mb-3"
        >
          EMBERFORGE
        </motion.h1>

        <motion.p variants={fadeUp} className="text-lg italic opacity-80 mb-2">
          Thy body is thy covenant. Tend the flame.
        </motion.p>

        <motion.p variants={fadeUp} className="font-ui text-xs text-faded mb-10">
          &ldquo;{epigraph}&rdquo;
        </motion.p>

        {profile ? (
          <>
            <motion.p variants={fadeUp} className="font-display text-bone tracking-wider mb-6">
              Welcome back, <span className="text-souls">{profile.name}</span>.
            </motion.p>
            {profile.title && (
              <motion.p
                variants={fadeUp}
                className="font-display text-[0.65rem] tracking-[0.25em] uppercase text-souls-dim -mt-4 mb-6"
              >
                {profile.title}
              </motion.p>
            )}
            <motion.button
              variants={fadeUp}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="btn-ember animate-ember-pulse"
              onClick={onRest}
            >
              Rest at Bonfire
            </motion.button>
            <motion.div variants={fadeUp}>
              <button
                onClick={() => {
                  if (window.confirm('Abandon this name? Thy deeds remain, but the name is lost.'))
                    clearProfile()
                }}
                className="mt-8 font-ui text-xs text-faded underline underline-offset-4 hover:text-bone-dim transition-colors"
              >
                begin anew under another name
              </button>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div variants={fadeUp} className="max-w-xs mx-auto mb-5">
              <input
                type="text"
                maxLength={24}
                placeholder="Speak thy name, ashen one"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && create()}
                className="input-dark min-h-12 text-center font-display tracking-widest"
                aria-label="character name"
              />
            </motion.div>
            <motion.button
              variants={fadeUp}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              disabled={!name.trim()}
              className="btn-ember animate-ember-pulse"
              onClick={create}
            >
              Forge thy Legend
            </motion.button>
            <motion.p variants={fadeUp} className="font-ui text-xs text-faded mt-6">
              Thy legend is kept on this device alone, within the ember of thy browser.
            </motion.p>
          </>
        )}
      </motion.main>
    </motion.div>
  )
}

/* ================================================================
   HUB — content above, tab bar fixed below
   ================================================================ */
const GearIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8 V5.2 M12 18.8 V21.2 M2.8 12 H5.2 M18.8 12 H21.2 M5.5 5.5 L7.2 7.2 M16.8 16.8 L18.5 18.5 M18.5 5.5 L16.8 7.2 M7.2 16.8 L5.5 18.5" />
  </svg>
)

/* Kindled Bonfire — the fire lives (default). Ashen Mark — the fire is dim (Hollowed). */
const KindledIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20 L20 17 M4 17 L20 20" />
    <path d="M12 14.6 C9.7 13.6 9.1 11.5 10.1 9.7 C10.7 10.7 11.5 11.1 11.5 11.1 C10.9 8.6 11.7 6.3 13.5 4.9 C13.1 7.2 14.7 8.2 15 10.3 C15.3 12.4 14.1 14.1 12 14.6 Z" />
  </svg>
)

const AshenIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20 L20 17 M4 17 L20 20" opacity="0.85" />
    <circle cx="12" cy="10.5" r="3.4" strokeDasharray="2.2 2.6" opacity="0.9" />
    <path d="M12 7.8 C12.7 8.9 12.7 9.9 12 11" opacity="0.6" />
  </svg>
)

function Hub() {
  const [tab, setTab] = useState<TabId>('sanctum')
  const [showSettings, setShowSettings] = useState(false)
  const xp = useGame((s) => s.xp)
  const souls = useGame((s) => s.souls)
  const profile = useGame((s) => s.profile)
  const hollowed = useGame((s) => s.settings.hollowed)
  const updateSettings = useGame((s) => s.updateSettings)
  const applyStatusEffects = useGame((s) => s.applyStatusEffects)
  const { level, into, needed } = levelInfo(xp)

  /* settle the curse's debt once per visit */
  useEffect(() => {
    applyStatusEffects()
  }, [applyStatusEffects])

  return (
    <motion.div
      key="hub"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.8, ease: 'easeOut', delay: 0.15 } }}
      style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
      className="min-h-screen max-w-2xl mx-auto px-4 pb-32"
    >
      {/* header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-souls text-xl tracking-[0.25em]">EMBERFORGE</h1>
          <span className="font-ui text-xs text-bone-dim">
            {profile && <span className="text-bone-dim">{profile.name} </span>}
            Lv <span className="text-souls font-semibold">{level}</span>
            <span className="text-faded"> &middot; </span>
            <span className="text-souls">&#9737;</span>{' '}
            <span className="text-souls font-semibold">{souls.toLocaleString()}</span>
            <button
              onClick={() => updateSettings({ hollowed: !hollowed })}
              aria-pressed={hollowed}
              aria-label={hollowed ? 'kindle the flame — leave Hollowed Mode' : 'go hollow — dim the world to ash'}
              className={`ml-2 min-h-10 min-w-10 inline-flex items-center justify-center align-middle transition-colors ${
                hollowed ? 'text-humanity hover:text-bone' : 'text-ember hover:text-ember-bright'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={hollowed ? 'ashen' : 'kindled'}
                  initial={{ opacity: 0, rotate: -35, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 35, scale: 0.6 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                  className={hollowed ? '' : 'drop-shadow-[0_0_6px_rgba(255,117,24,0.75)]'}
                >
                  {hollowed ? <AshenIcon /> : <KindledIcon />}
                </motion.span>
              </AnimatePresence>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="open settings"
              className="ml-1 min-h-10 min-w-10 inline-flex items-center justify-center align-middle text-bone-dim hover:text-souls transition-colors"
            >
              <GearIcon />
            </button>
          </span>
        </div>
        {/* XP toward next level */}
        <div className="mt-2 h-1 bg-abyss border border-ash overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ember-deep to-souls transition-all duration-700"
            style={{ width: `${(into / needed) * 100}%` }}
          />
        </div>
        <div className="font-ui text-[0.65rem] text-faded mt-1 text-right">
          {into} / {needed} XP to Lv {level + 1}
        </div>
      </header>

      {/* tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {tab === 'sanctum' ? (
            <Dashboard />
          ) : tab === 'combat' ? (
            <CombatLog />
          ) : tab === 'rations' ? (
            <RationsTracker />
          ) : tab === 'keeper' ? (
            <FireKeeper />
          ) : (
            <TheCodex />
          )}
        </motion.div>
      </AnimatePresence>

      <SigilWatcher />

      <BottomNav tab={tab} onChange={setTab} />

      <SettingsSheet open={showSettings} onClose={() => setShowSettings(false)} />
    </motion.div>
  )
}

/* ================================================================
   APP — view switching
   ================================================================ */
export default function App() {
  const [view, setView] = useState<View>('title')
  const [booted, setBooted] = useState(false)
  const manualHollow = useGame((s) => s.settings.hollowed)
  const battles = useGame((s) => s.battles)
  /* Curse of Hollowing — more than 4 idle days forces the spectral palette,
     exactly like the manual toggle (statusEffects → cursed, CURSE_AFTER_DAYS = 4). */
  const hollowed = manualHollow || statusEffects(battles).cursed
  const [sweep, setSweep] = useState(0)
  const firstTheme = useRef(true)

  /* settings can summon the Rite of Embers again */
  useEffect(() => {
    const h = () => setView('rite')
    window.addEventListener('emberforge:rite', h)
    return () => window.removeEventListener('emberforge:rite', h)
  }, [])

  /* Hollowed Mode rides on <html>; on change, arm a brief cross-app
     crossfade and fire a spectral (or rekindling) sweep. */
  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('hollowed', hollowed)
    if (firstTheme.current) {
      firstTheme.current = false
      return
    }
    el.classList.add('theme-shift')
    setSweep(Date.now())
    const t = window.setTimeout(() => el.classList.remove('theme-shift'), 900)
    return () => window.clearTimeout(t)
  }, [hollowed])

  return (
    <ToastProvider>
      <AnimatePresence mode="wait">
        {!booted ? (
          <Splash key="splash" onDone={() => setBooted(true)} />
        ) : view === 'title' ? (
          <TitleScreen
            key="title"
            onRest={() => setView('hub')}
            onNewLegend={() => setView('rite')}
          />
        ) : view === 'rite' ? (
          <RiteOfEmbers key="rite" onDone={() => setView('hub')} />
        ) : (
          <Hub key="hub" />
        )}
      </AnimatePresence>
      <InstallPrompt />

      {/* palette-shift sweep — spectral when hollowing, ember when re-kindling */}
      <AnimatePresence>
        {sweep > 0 && (
          <motion.div
            key={sweep}
            aria-hidden
            className="fixed inset-0 z-[85] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, times: [0, 0.32, 1], ease: 'easeInOut' }}
            style={{
              background: hollowed
                ? 'radial-gradient(circle at 50% 42%, rgba(109,168,207,0.5), transparent 70%)'
                : 'radial-gradient(circle at 50% 42%, rgba(255,117,24,0.45), transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>
    </ToastProvider>
  )
}
