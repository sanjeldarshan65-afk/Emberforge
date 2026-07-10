import { epley } from './store'
import type { Battle, Vitals, Ration } from './store'

/* ================================================================
   LIGHT THE FIRST FLAME — demo data.
   Seeds ~4 weeks of realistic, progressively-overloading battles plus
   weigh-ins, rations and vitals, so a new save can see every widget
   fully alive. Deterministic (no randomness) so it looks the same each
   time. The real save is preserved by the caller before this is applied.
   ================================================================ */

export type DemoSeed = {
  battles: Battle[]
  prs: Record<string, number>
  xp: number
  souls: number
  vitals: Vitals
  weighIns: { date: string; weight: number }[]
  rations: Ration[]
  lifetimeVolume: number
  lifetimeSets: number
}

const DAY = 86_400_000

const isoDaysAgo = (daysAgo: number, hour: number): string => {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return new Date(d.getTime() - daysAgo * DAY).toISOString()
}

const dayKey = (daysAgo: number): string => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  const t = new Date(d.getTime() - daysAgo * DAY)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export function buildDemoState(): DemoSeed {
  const base: Record<string, number> = {
    Squat: 185,
    'Bench Press': 135,
    Deadlift: 225,
    'Overhead Press': 95,
    'Barbell Row': 115,
  }
  const inc: Record<string, number> = {
    Squat: 10,
    'Bench Press': 5,
    Deadlift: 15,
    'Overhead Press': 5,
    'Barbell Row': 5,
  }
  // a rotating 4-day split; two lifts logged per training day
  const plan: string[][] = [
    ['Squat', 'Bench Press'],
    ['Deadlift', 'Overhead Press'],
    ['Squat', 'Barbell Row'],
    ['Bench Press', 'Deadlift'],
  ]
  // 16 sessions across 28 days (~4 / week)
  const daysAgoList = [27, 25, 23, 21, 20, 18, 16, 14, 13, 11, 9, 7, 6, 4, 2, 0]

  const best: Record<string, number> = {
    Squat: 0,
    'Bench Press': 0,
    Deadlift: 0,
    'Overhead Press': 0,
    'Barbell Row': 0,
  }
  const battles: Battle[] = []
  let xp = 0
  let souls = 0
  let lifetimeVolume = 0
  let lifetimeSets = 0
  let id = 1

  daysAgoList.forEach((daysAgo, i) => {
    const week = Math.max(0, 3 - Math.floor(daysAgo / 7)) // 0 (oldest) … 3 (newest)
    plan[i % 4].forEach((mv, j) => {
      const top = base[mv] + week * inc[mv]
      const sets = [
        { weight: top, reps: 5 },
        { weight: top, reps: 5 },
        { weight: top, reps: 5 },
      ]
      const volume = sets.reduce((t, s) => t + s.weight * s.reps, 0)
      const pr = top > best[mv]
      if (pr) best[mv] = top
      battles.push({
        id: `demo-${id++}`,
        movement: mv as Battle['movement'],
        date: isoDaysAgo(daysAgo, 17 + j), // stagger the day's two lifts by an hour
        sets,
        topWeight: top,
        topReps: 5,
        e1rm: epley(top, 5),
        volume,
        newPR: pr,
      })
      xp += sets.length * 20 + 30 + (pr ? 50 : 0)
      souls += volume
      lifetimeVolume += volume
      lifetimeSets += sets.length
    })
  })
  battles.sort((a, b) => (a.date < b.date ? 1 : -1)) // store convention: newest first

  // weigh-ins: a gentle downward trend (a slow cut) over 28 days
  const weighIns: { date: string; weight: number }[] = []
  for (let d = 28; d >= 0; d -= 2) {
    const w = Math.round((181 - ((28 - d) / 28) * 4 + (d % 4 === 0 ? 0.3 : -0.2)) * 10) / 10
    weighIns.push({ date: dayKey(d), weight: w })
  }

  // rations: the last 10 days, three meals a day
  const meals: { name: string; calories: number; protein: number; carbs: number; fats: number }[] = [
    { name: 'Eggs & Oats', calories: 520, protein: 34, carbs: 58, fats: 16 },
    { name: 'Chicken & Rice', calories: 680, protein: 52, carbs: 74, fats: 14 },
    { name: 'Whey Shake', calories: 240, protein: 48, carbs: 6, fats: 3 },
    { name: 'Steak & Potato', calories: 760, protein: 56, carbs: 52, fats: 34 },
    { name: 'Greek Yogurt & Berries', calories: 300, protein: 24, carbs: 34, fats: 6 },
    { name: 'Salmon & Greens', calories: 590, protein: 44, carbs: 18, fats: 36 },
  ]
  const rations: Ration[] = []
  let rid = 1
  for (let d = 9; d >= 0; d--) {
    for (const off of [0, 2, 4]) {
      const m = meals[(d + off) % meals.length]
      rations.push({ id: `demo-r-${rid++}`, date: dayKey(d), ...m })
    }
  }

  const vitals: Vitals = { bodyweight: 178, bodyFat: 14.5, waist: 32, shoulders: 49, chest: 43 }

  return {
    battles,
    prs: best,
    xp,
    souls,
    vitals,
    weighIns,
    rations,
    lifetimeVolume,
    lifetimeSets,
  }
}
