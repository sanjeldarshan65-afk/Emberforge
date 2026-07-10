import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { muscleFatigue } from './recovery'
import type { FatigueMap } from './recovery'

/* ================================================================
   EMBERFORGE — global game state (Zustand + localStorage persist)
   ================================================================ */

/* ---------- movements ----------
   The five great compounds remain the quick-access core, but any
   rite from the catalog (src/state/exercises.ts) may be logged. */
export const MOVEMENTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row'] as const
export type Movement = string

/* ---------- types ---------- */
export type CompletedSet = { weight: number; reps: number }

export type Battle = {
  id: string
  movement: Movement
  date: string // ISO
  sets: CompletedSet[]
  topWeight: number
  topReps: number
  e1rm: number
  volume: number
  newPR: boolean
}

export type Vitals = {
  bodyweight: number
  bodyFat: number
  waist: number
  shoulders: number
  chest: number
}

export type Macros = { calories: number; protein: number; carbs: number; fats: number }

export type Ration = Macros & { id: string; name: string; date: string }

export type Profile = { name: string; createdAt: string; title?: string }

export type Routine = { id: string; name: string; movements: Movement[] }

export type Settings = {
  units: 'lb' | 'kg'
  barWeight: number       // empty bar, in chosen units
  restSeconds: number     // bonfire rest duration
  autoRestTimer: boolean  // kindle timer on set completion
  vibration: boolean      // haptic pulse when rest ends
  showAvatar: boolean     // the vessel in the Sanctum
  sound: boolean          // synthesized UI audio
  taperGoal: number       // shoulder:waist target
  hollowed: boolean       // Hollowed Mode — spectral ash/bone palette
}

export const DEFAULT_SETTINGS: Settings = {
  units: 'lb',
  barWeight: 45,
  restSeconds: 90,
  autoRestTimer: true,
  vibration: true,
  showAvatar: true,
  sound: true,
  taperGoal: 1.618,
  hollowed: false,
}

export type BattleReward = {
  movement: Movement
  xp: number
  souls: number
  leveledUp: boolean
  newLevel: number
  prBroken: boolean
  ascended: boolean
}

/* ---------- date helpers ---------- */
/** local YYYY-MM-DD for any ISO date */
export const localDayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA')

/** local YYYY-MM-DD for today — ration totals + curse decay reset daily */
export const todayKey = () => new Date().toLocaleDateString('en-CA')

/** absolute day number from a YYYY-MM-DD key (safe for date math) */
const dayNum = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/* ---------- leveling math ---------- */
/** XP required to advance FROM this level to the next */
export const xpToAdvance = (level: number) => level * 100

/** derive level + progress within it from lifetime XP */
export function levelInfo(totalXp: number) {
  let level = 1
  let rem = totalXp
  while (rem >= xpToAdvance(level)) {
    rem -= xpToAdvance(level)
    level++
  }
  return { level, into: rem, needed: xpToAdvance(level) }
}

/** Epley estimated one-rep max */
export const epley = (weight: number, reps: number) =>
  Math.round(weight * (1 + reps / 30))

/* ---------- reward + status tuning ---------- */
const XP_PER_SET = 20
const XP_PER_BATTLE = 30
const XP_PER_PR = 50
const BATTLES_KEPT = 60 // enough history for the Souls Ledger charts
const RATIONS_KEPT = 200

export const ASCEND_STREAK = 3      // consecutive workout days for the buff
export const ASCEND_MULT = 1.2      // souls multiplier while ascended
export const CURSE_AFTER_DAYS = 4   // idle days before the Curse of Hollowing takes hold
export const CURSE_DRAIN = 0.02     // souls drained per cursed (hollowed) day

/* ---------- status effects (pure, derived from battle history) ---------- */
export type StatusEffects = {
  streak: number              // consecutive workout days ending today/yesterday
  daysSinceLast: number | null
  ascended: boolean
  cursed: boolean
}

export function statusEffects(battles: Battle[]): StatusEffects {
  const dayKeys = [...new Set(battles.map((b) => localDayKey(b.date)))] // newest first
  if (dayKeys.length === 0) {
    return { streak: 0, daysSinceLast: null, ascended: false, cursed: false }
  }

  const daysSinceLast = dayNum(todayKey()) - dayNum(dayKeys[0])

  /* streak only lives if the chain reaches today or yesterday */
  let streak = 0
  if (daysSinceLast <= 1) {
    streak = 1
    for (let i = 1; i < dayKeys.length; i++) {
      if (dayNum(dayKeys[i - 1]) - dayNum(dayKeys[i]) === 1) streak++
      else break
    }
  }

  return {
    streak,
    daysSinceLast,
    ascended: streak >= ASCEND_STREAK,
    cursed: daysSinceLast >= CURSE_AFTER_DAYS,
  }
}

/* ---------- store ---------- */
type GameState = {
  xp: number
  souls: number
  vitals: Vitals
  prs: Record<string, number> // per-exercise records, created on first battle
  battles: Battle[]
  macroGoals: Macros
  rations: Ration[]
  lastDecay: string | null // last day the curse drained souls (YYYY-MM-DD)
  lifetimeVolume: number // total iron moved, ever
  lifetimeSets: number // total sets vanquished, ever
  sigilsSeen: string[] // sigil unlock toasts already shown
  weighIns: { date: string; weight: number }[] // bodyweight history, day-keyed
  profile: Profile | null
  settings: Settings
  routines: Routine[]
  setVital: (key: keyof Vitals, value: number) => void
  endBattle: (movement: Movement, sets: CompletedSet[]) => BattleReward
  logRation: (name: string, macros: Macros) => void
  removeRation: (id: string) => void
  applyStatusEffects: () => void
  setProfile: (name: string) => void
  anointTitle: (title: string) => void
  clearProfile: () => void
  updateSettings: (patch: Partial<Settings>) => void
  setMacroGoal: (key: keyof Macros, value: number) => void
  saveRoutine: (name: string, movements: Movement[]) => void
  updateRoutine: (id: string, name: string, movements: Movement[]) => void
  deleteRoutine: (id: string) => void
  markSigilsSeen: (ids: string[]) => void
  logWeight: (weight: number) => void
  fatigue: () => FatigueMap // derived muscle-heat map, read from battle history
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      xp: 0,
      souls: 0,
      vitals: { bodyweight: 172, bodyFat: 16.2, waist: 31, shoulders: 48, chest: 41.5 },
      prs: { Squat: 0, 'Bench Press': 0, Deadlift: 0, 'Overhead Press': 0, 'Barbell Row': 0 },
      battles: [],
      macroGoals: { calories: 2400, protein: 180, carbs: 220, fats: 75 },
      rations: [],
      lastDecay: null,
      lifetimeVolume: 0,
      lifetimeSets: 0,
      sigilsSeen: [],
      weighIns: [],
      profile: null,
      settings: DEFAULT_SETTINGS,
      routines: [],

      /* derived muscle-fatigue heatmap (0 rested … 1 aflame), from battle history */
      fatigue: () => muscleFatigue(get().battles),

      setProfile: (name) =>
        set({ profile: { name, createdAt: new Date().toISOString() } }),

      anointTitle: (title) =>
        set((s) => (s.profile ? { profile: { ...s.profile, title } } : {})),

      clearProfile: () => set({ profile: null }),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      setMacroGoal: (key, value) =>
        set((s) => ({ macroGoals: { ...s.macroGoals, [key]: Math.max(0, value) } })),

      saveRoutine: (name, movements) =>
        set((s) => ({
          routines: [...s.routines, { id: crypto.randomUUID(), name, movements }],
        })),

      updateRoutine: (id, name, movements) =>
        set((s) => ({
          routines: s.routines.map((r) => (r.id === id ? { ...r, name, movements } : r)),
        })),

      deleteRoutine: (id) =>
        set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),

      markSigilsSeen: (ids) =>
        set((s) => ({ sigilsSeen: [...new Set([...s.sigilsSeen, ...ids])] })),

      logWeight: (weight) =>
        set((s) => {
          if (!(weight > 0)) return {}
          const day = todayKey()
          const rest = s.weighIns.filter((w) => w.date !== day)
          return { weighIns: [...rest, { date: day, weight }].slice(-120) }
        }),

      setVital: (key, value) =>
        set((s) => ({ vitals: { ...s.vitals, [key]: value } })),

      endBattle: (movement, sets) => {
        const s = get()

        const volume = sets.reduce((t, x) => t + x.weight * x.reps, 0)
        const top = sets.reduce((a, b) => (b.weight > a.weight ? b : a), sets[0])
        const prBroken = top.weight > (s.prs[movement] ?? 0)

        const battle: Battle = {
          id: crypto.randomUUID(),
          movement,
          date: new Date().toISOString(),
          sets,
          topWeight: top.weight,
          topReps: top.reps,
          e1rm: epley(top.weight, top.reps),
          volume,
          newPR: prBroken,
        }

        /* ascension is judged WITH today's battle — completing the
           3rd straight day means this workout already earns 1.2x */
        const withToday = [battle, ...s.battles]
        const { ascended } = statusEffects(withToday)

        const xpGain =
          sets.length * XP_PER_SET + XP_PER_BATTLE + (prBroken ? XP_PER_PR : 0)
        /* the Rite of Ascension — once the Golden Taper (1.618) is held, souls x1.5 forever */
        const taper = s.vitals.waist > 0 ? s.vitals.shoulders / s.vitals.waist : 0
        const ascendedTaper = taper >= 1.618
        const soulsGain = Math.round(
          volume * (ascended ? ASCEND_MULT : 1) * (ascendedTaper ? 1.5 : 1)
        )

        const levelBefore = levelInfo(s.xp).level
        const levelAfter = levelInfo(s.xp + xpGain).level

        set({
          xp: s.xp + xpGain,
          souls: s.souls + soulsGain,
          lifetimeVolume: s.lifetimeVolume + volume,
          lifetimeSets: s.lifetimeSets + sets.length,
          prs: prBroken ? { ...s.prs, [movement]: top.weight } : s.prs,
          battles: withToday.slice(0, BATTLES_KEPT),
        })

        return {
          movement,
          xp: xpGain,
          souls: soulsGain,
          leveledUp: levelAfter > levelBefore,
          newLevel: levelAfter,
          prBroken,
          ascended,
        }
      },

      logRation: (name, macros) =>
        set((s) => ({
          rations: [
            { id: crypto.randomUUID(), name, date: todayKey(), ...macros },
            ...s.rations,
          ].slice(0, RATIONS_KEPT),
        })),

      removeRation: (id) =>
        set((s) => ({ rations: s.rations.filter((r) => r.id !== id) })),

      /* the Curse Mark of Death — call on app load; drains 5% of souls
         for every cursed day not yet paid, exactly once per day */
      applyStatusEffects: () => {
        const s = get()
        const st = statusEffects(s.battles)
        if (!st.cursed || s.souls <= 0 || s.battles.length === 0) return

        const today = todayKey()
        const lastWorkoutDay = dayNum(localDayKey(s.battles[0].date))
        const curseStart = lastWorkoutDay + CURSE_AFTER_DAYS // first draining day
        const from = s.lastDecay
          ? Math.max(dayNum(s.lastDecay) + 1, curseStart)
          : curseStart
        const to = dayNum(today)
        const daysOwed = to - from + 1
        if (daysOwed <= 0) return

        set({
          souls: Math.floor(s.souls * Math.pow(1 - CURSE_DRAIN, daysOwed)),
          lastDecay: today,
        })
      },
    }),
    { name: 'emberforge-save' }
  )
)
