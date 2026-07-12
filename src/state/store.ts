import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sanitizeSave, isBattleLike } from './sanitize'
import {
  localDayKey,
  todayKey,
  dayNum,
  keyFromDayNum,
  statusEffects,
  ASCEND_MULT,
  CURSE_AFTER_DAYS,
  CURSE_DRAIN,
  EMBER_BANK_COST,
  EMBER_BANK_MAX,
} from './streak.ts'

/* day math, streak derivation, and the Ember Bank constants live in the
   runtime-leaf module streak.ts (so node tests can import them directly);
   everything is re-exported here so the app keeps one import path */
export * from './streak.ts'
import { muscleFatigue } from './recovery'
import type { FatigueMap } from './recovery'
import { LEVEL_DROPS, PR_MILESTONES, sumEffects, getItem } from './items'
import { constellationEffects } from './constellation'
import type { DemoSeed } from './demoData'

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

/* The Cauldron — a component of a crafted meal (per-unit macros × qty) */
export type MealItem = Macros & { name: string; qty: number }
/* a saved custom meal; the Macros fields hold the summed totals */
export type SavedMeal = Macros & { id: string; name: string; items: MealItem[] }

/* The Hoard — an owned item: which catalog id, how many, and when it was claimed */
export type OwnedItem = { id: string; qty: number; acquiredDate: string }

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
  cloudEndpoint: string   // opt-in encrypted cloud-sync URL (empty = off, the default)
  reminders: boolean      // Ember Reminders — local notifications while the app is open
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
  cloudEndpoint: '',
  reminders: false,
}

export type BattleReward = {
  movement: Movement
  xp: number
  souls: number
  leveledUp: boolean
  newLevel: number
  prBroken: boolean
  ascended: boolean
  drops: string[] // item ids granted by this battle (level-up table + PR milestones)
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

/* The Rite of Ascension — a prestige Cycle. Spend an escalating pile of souls to
   pass on the flame and begin anew; each Cycle grants a permanent, stacking souls &
   XP bonus. Real training history — battles, PRs, vitals — is never touched. */
export const ASCEND_BASE_COST = 150000
export const ASCEND_BONUS = 20        // % souls & xp granted per completed Cycle
export const ASCEND_REVEAL_LEVEL = 8  // the Rite reveals itself at this level
export const ascendCost = (cycle: number) => ASCEND_BASE_COST * (cycle + 1)

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
  savedMeals: SavedMeal[]
  installDismissed: boolean
  inventory: OwnedItem[]
  claimedQuests: string[]
  claimedSeasons: string[]
  claimedDailies: string[] // day-keys (YYYY-MM-DD) whose Daily Ember was claimed
  emberBank: number // banked embers — streak insurance, max EMBER_BANK_MAX
  emberBurns: string[] // day-keys a burned ember covered (bridge the streak chain)
  bossesDefeated: string[]
  unlockedNodes: string[]
  ascensionLevel: number
  demoActive: boolean
  setVital: (key: keyof Vitals, value: number) => void
  endBattle: (movement: Movement, sets: CompletedSet[]) => BattleReward
  logRation: (name: string, macros: Macros) => void
  removeRation: (id: string) => void
  saveMeal: (meal: Omit<SavedMeal, 'id'>) => void
  updateMeal: (id: string, meal: Omit<SavedMeal, 'id'>) => void
  deleteMeal: (id: string) => void
  dismissInstall: () => void
  hasItem: (id: string) => boolean
  grantItem: (id: string) => void
  buyItem: (id: string, price: number) => boolean
  claimQuest: (id: string, souls: number, itemReward?: string) => void
  claimSeason: (id: string, souls: number) => void
  claimDaily: (dayKey: string, souls: number) => void
  bankEmber: () => boolean
  defeatBoss: (id: string, souls: number, trophy?: string) => void
  unlockNode: (id: string, cost: number) => boolean
  ascend: () => boolean
  applyDemo: (seed: DemoSeed) => void
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
      savedMeals: [],
      installDismissed: false,
      /* The Hoard begins with what every ashen one carries from the first kindling */
      inventory: [
        { id: 'unkindled-ash', qty: 1, acquiredDate: new Date().toISOString() },
        { id: 'tarnished-coin', qty: 1, acquiredDate: new Date().toISOString() },
      ],
      claimedQuests: [],
      claimedSeasons: [],
      claimedDailies: [],
      emberBank: 0,
      emberBurns: [],
      bossesDefeated: [],
      unlockedNodes: [],
      ascensionLevel: 0,
      demoActive: false,

      /* derived muscle-fatigue heatmap (0 rested … 1 aflame), from battle history */
      fatigue: () =>
        muscleFatigue(
          get().battles,
          1 +
            (sumEffects(new Set(get().inventory.map((o) => o.id))).recoveryPct +
              constellationEffects(new Set(get().unlockedNodes)).recoveryPct) /
              100
        ),

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
           3rd straight day means this workout already earns 1.2x
           (burned embers bridge the chain here too) */
        const withToday = [battle, ...s.battles]
        const { ascended } = statusEffects(withToday, s.emberBurns)

        /* relics ALREADY in the Hoard modify the take; drops from THIS battle do not */
        const ownedIds = new Set(s.inventory.map((o) => o.id))
        const eff = sumEffects(ownedIds)
        const cEff = constellationEffects(new Set(s.unlockedNodes))
        const ascBonus = s.ascensionLevel * ASCEND_BONUS // permanent per-Cycle souls & xp gain
        const soulsPct = eff.soulsPct + cEff.soulsPct + ascBonus
        const xpPct = eff.xpPct + cEff.xpPct + ascBonus

        const xpGain = Math.round(
          (sets.length * XP_PER_SET + XP_PER_BATTLE + (prBroken ? XP_PER_PR : 0)) * (1 + xpPct / 100)
        )
        /* the Rite of Ascension — once the Golden Taper (1.618) is held, souls x1.5 forever */
        const taper = s.vitals.waist > 0 ? s.vitals.shoulders / s.vitals.waist : 0
        const ascendedTaper = taper >= 1.618
        const soulsGain = Math.round(
          volume *
            (ascended ? ASCEND_MULT : 1) *
            (ascendedTaper ? 1.5 : 1) *
            (1 + soulsPct / 100)
        )

        const levelBefore = levelInfo(s.xp).level
        const levelAfter = levelInfo(s.xp + xpGain).level

        /* ---- loot drops: level-up table + first-time PR milestones (never duplicated) ---- */
        const drops: string[] = []
        for (let lvl = levelBefore + 1; lvl <= levelAfter; lvl++) {
          const id = LEVEL_DROPS[lvl]
          if (id && !ownedIds.has(id) && !drops.includes(id)) drops.push(id)
        }
        if (prBroken) {
          for (const m of PR_MILESTONES) {
            if (battle.e1rm >= m.e1rm && !ownedIds.has(m.itemId) && !drops.includes(m.itemId))
              drops.push(m.itemId)
          }
        }
        const claimedAt = new Date().toISOString()
        const inventory = drops.length
          ? [...s.inventory, ...drops.map((id) => ({ id, qty: 1, acquiredDate: claimedAt }))]
          : s.inventory

        set({
          xp: s.xp + xpGain,
          souls: s.souls + soulsGain,
          lifetimeVolume: s.lifetimeVolume + volume,
          lifetimeSets: s.lifetimeSets + sets.length,
          prs: prBroken ? { ...s.prs, [movement]: top.weight } : s.prs,
          battles: withToday.slice(0, BATTLES_KEPT),
          inventory,
        })

        return {
          movement,
          xp: xpGain,
          souls: soulsGain,
          leveledUp: levelAfter > levelBefore,
          newLevel: levelAfter,
          prBroken,
          ascended,
          drops,
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

      /* The Cauldron — persisted custom meals */
      saveMeal: (meal) =>
        set((s) => ({ savedMeals: [{ id: crypto.randomUUID(), ...meal }, ...s.savedMeals] })),
      updateMeal: (id, meal) =>
        set((s) => ({ savedMeals: s.savedMeals.map((m) => (m.id === id ? { id, ...meal } : m)) })),
      deleteMeal: (id) =>
        set((s) => ({ savedMeals: s.savedMeals.filter((m) => m.id !== id) })),

      dismissInstall: () => set({ installDismissed: true }),

      hasItem: (id) => get().inventory.some((o) => o.id === id),

      /* the clean hook for granting any item by id — used by drops now, quests later.
         Unique items never duplicate; stackable ones increment quantity. */
      grantItem: (id) =>
        set((s) => {
          const existing = s.inventory.find((o) => o.id === id)
          if (existing) {
            if (!getItem(id)?.stackable) return {}
            return { inventory: s.inventory.map((o) => (o.id === id ? { ...o, qty: o.qty + 1 } : o)) }
          }
          return { inventory: [...s.inventory, { id, qty: 1, acquiredDate: new Date().toISOString() }] }
        }),

      /* The Merchant — spend souls to acquire an item. Blocks on insufficient
         souls or an already-owned unique. Returns false when the deal is refused. */
      buyItem: (id, price) => {
        const s = get()
        const owned = s.inventory.find((o) => o.id === id)
        if (s.souls < price) return false
        if (owned && !getItem(id)?.stackable) return false
        const now = new Date().toISOString()
        const inventory = owned
          ? s.inventory.map((o) => (o.id === id ? { ...o, qty: o.qty + 1 } : o))
          : [...s.inventory, { id, qty: 1, acquiredDate: now }]
        set({ souls: s.souls - price, inventory })
        return true
      },

      /* Covenants — claim a completed quest: souls + (optional) item via the loot path, once */
      claimQuest: (id, souls, itemReward) => {
        const s = get()
        if (s.claimedQuests.includes(id)) return
        if (itemReward) s.grantItem(itemReward)
        set((st) => ({ souls: st.souls + souls, claimedQuests: [...st.claimedQuests, id] }))
      },

      /* The Rite of the Season — claim the quarter's trial once it's met, once per season id */
      claimSeason: (id, souls) => {
        const s = get()
        if (s.claimedSeasons.includes(id)) return
        set((st) => ({ souls: st.souls + souls, claimedSeasons: [...st.claimedSeasons, id] }))
      },

      /* The Ember Bank — trade souls for streak insurance, capped */
      bankEmber: () => {
        const s = get()
        if (s.souls < EMBER_BANK_COST || s.emberBank >= EMBER_BANK_MAX) return false
        set({ souls: s.souls - EMBER_BANK_COST, emberBank: s.emberBank + 1 })
        return true
      },

      /* The Daily Ember — claim today's small trial, once per day-key */
      claimDaily: (dayKey, souls) => {
        const s = get()
        if (s.claimedDailies.includes(dayKey)) return
        set((st) => ({
          souls: st.souls + souls,
          claimedDailies: [...st.claimedDailies, dayKey].slice(-60),
        }))
      },

      /* Boss Encounters — fell a challenge lift: bonus souls + trophy via the loot path, once */
      defeatBoss: (id, souls, trophy) => {
        const s = get()
        if (s.bossesDefeated.includes(id)) return
        if (trophy) s.grantItem(trophy)
        set((st) => ({ souls: st.souls + souls, bossesDefeated: [...st.bossesDefeated, id] }))
      },

      /* The Constellation — spend souls to unlock a node (prerequisites enforced in the UI) */
      unlockNode: (id, cost) => {
        const s = get()
        if (s.unlockedNodes.includes(id) || s.souls < cost) return false
        set({ souls: s.souls - cost, unlockedNodes: [...s.unlockedNodes, id] })
        return true
      },

      /* The Rite of Ascension — spend an escalating pile of souls to begin a new Cycle.
         Grants a permanent, stacking souls & XP bonus; logged history is left intact. */
      ascend: () => {
        const s = get()
        const cost = ascendCost(s.ascensionLevel)
        if (s.souls < cost) return false
        set({ souls: s.souls - cost, ascensionLevel: s.ascensionLevel + 1 })
        return true
      },

      /* Light the First Flame — replace the live training slices with demo data.
         The caller backs up the real save first, so this never destroys progress. */
      applyDemo: (seed) => set({ ...seed, demoActive: true }),

      /* the Curse Mark of Death — call on app load; drains 5% of souls
         for every cursed day not yet paid, exactly once per day.
         Before judgment, the Ember Bank spends itself: banked embers burn to
         bridge any rest days between the last battle and today — but only when
         the bank can cover the WHOLE gap (a half-bridged streak is still dead,
         and the embers are better kept). */
      applyStatusEffects: () => {
        {
          const s = get()
          if (s.battles.length > 0 && s.emberBank > 0) {
            const last = dayNum(localDayKey(s.battles[0].date))
            const today = dayNum(todayKey())
            const burnsSet = new Set(s.emberBurns)
            const missing: string[] = []
            for (let d = last + 1; d <= today - 1; d++) {
              const key = keyFromDayNum(d)
              if (!burnsSet.has(key)) missing.push(key)
            }
            if (missing.length >= 1 && missing.length <= s.emberBank) {
              set({
                emberBank: s.emberBank - missing.length,
                emberBurns: [...s.emberBurns, ...missing].slice(-60),
              })
            }
          }
        }

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
    {
      name: 'emberforge-save',
      /* self-healing rehydration: a damaged field falls back to its default
         instead of crashing the first render into the YOU DIED boundary */
      merge: (persisted, current) => {
        const clean = sanitizeSave(persisted, current as unknown as Record<string, unknown>)
        clean.battles = (clean.battles as unknown[]).filter(isBattleLike)
        return clean as unknown as GameState
      },
    }
  )
)
