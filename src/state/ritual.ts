import type { Macros } from './store'

/* ================================================================
   THE RITE OF EMBERS — forge a covenant from flesh and ambition
   Pure function: answers in, a complete starting plan out.
   ================================================================ */

export type Goal = 'strength' | 'taper' | 'cut' | 'bulk'
export type Experience = 'unkindled' | 'kindled' | 'cinder'

export type RiteAnswers = {
  units: 'lb' | 'kg'
  bodyweight: number
  bodyFat: number
  goal: Goal
  experience: Experience
  days: 2 | 3 | 4 | 5
}

export type RitePlan = {
  title: string
  decree: string
  macroGoals: Macros
  taperGoal: number
  restSeconds: number
  routines: { name: string; movements: string[] }[]
}

const KCAL_MULT: Record<Goal, number> = { cut: 11.5, taper: 13.5, strength: 15, bulk: 16.5 }
const REST: Record<Goal, number> = { strength: 180, bulk: 120, taper: 90, cut: 60 }
const TAPER: Record<Goal, number> = { taper: 1.618, strength: 1.5, cut: 1.55, bulk: 1.55 }
const TITLES: Record<Goal, string> = {
  strength: 'Knight of the Iron Creed',
  taper: 'Ascendant of the Golden Taper',
  cut: 'Blade of the Burning Ash',
  bulk: 'Colossus in Waiting',
}
const GOAL_WORD: Record<Goal, string> = {
  strength: 'raw strength',
  taper: 'the golden taper',
  cut: 'the burning away of ash',
  bulk: 'mass and might',
}

export function forgePlan(a: RiteAnswers): RitePlan {
  /* ---- nourishment ---- */
  const bwLb = a.units === 'kg' ? a.bodyweight * 2.2046 : a.bodyweight
  const calories = Math.round((bwLb * KCAL_MULT[a.goal]) / 50) * 50
  const protein = Math.round((bwLb * (a.goal === 'cut' ? 1.1 : 1.0)) / 5) * 5
  const fats = Math.round((bwLb * 0.35) / 5) * 5
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4 / 5) * 5)

  /* ---- the battle plans ---- */
  const novice = a.experience === 'unkindled'
  const pull = novice ? 'Lat Pulldown' : 'Pull-Up'
  const aesthetics = a.goal === 'taper'

  const fullA = ['Squat', 'Bench Press', 'Barbell Row', ...(aesthetics ? ['Lateral Raise'] : [])]
  const fullB = ['Deadlift', 'Overhead Press', pull, ...(aesthetics ? ['Face Pull'] : [])]
  const fullC = ['Front Squat', 'Incline Bench Press', 'Lat Pulldown', 'Plank']
  const push = ['Bench Press', 'Overhead Press', 'Incline Bench Press', ...(aesthetics ? ['Lateral Raise'] : ['Dip'])]
  const pullDay = ['Barbell Row', pull, 'Face Pull', 'Barbell Curl']
  const legs = ['Squat', 'Romanian Deadlift', 'Leg Press', ...(aesthetics ? ['Hip Thrust'] : [])]
  const upper1 = ['Bench Press', 'Barbell Row', 'Overhead Press', ...(aesthetics ? ['Lateral Raise'] : [pull])]
  const lower1 = ['Squat', 'Romanian Deadlift', 'Leg Press']
  const upper2 = ['Incline Bench Press', pull, 'Face Pull', 'Barbell Curl']
  const lower2 = ['Deadlift', 'Front Squat', 'Hip Thrust']

  let routines: { name: string; movements: string[] }[]
  if (a.days === 2) {
    routines = [
      { name: 'Rite I — The Whole Vessel', movements: fullA },
      { name: 'Rite II — The Whole Vessel', movements: fullB },
    ]
  } else if (a.days === 3) {
    routines = novice
      ? [
          { name: 'Rite I — Foundation', movements: fullA },
          { name: 'Rite II — Foundation', movements: fullB },
          { name: 'Rite III — Foundation', movements: fullC },
        ]
      : [
          { name: 'The Push Vanguard', movements: push },
          { name: 'The Pulling Legion', movements: pullDay },
          { name: 'Pillars of the Earth', movements: legs },
        ]
  } else if (a.days === 4) {
    routines = [
      { name: 'Upper Bastion I', movements: upper1 },
      { name: 'Lower Bastion I', movements: lower1 },
      { name: 'Upper Bastion II', movements: upper2 },
      { name: 'Lower Bastion II', movements: lower2 },
    ]
  } else {
    routines = [
      { name: 'The Push Vanguard', movements: push },
      { name: 'The Pulling Legion', movements: pullDay },
      { name: 'Pillars of the Earth', movements: legs },
      { name: 'Upper Bastion', movements: upper2 },
      { name: 'Lower Bastion', movements: lower2 },
    ]
  }

  const decree = `${a.days} battles each week. ${calories.toLocaleString()} kcal and ${protein}g of protein each day, in service of ${GOAL_WORD[a.goal]}. Rest ${REST[a.goal]} breaths-in-seconds between sets. The flame will watch.`

  return {
    title: TITLES[a.goal],
    decree,
    macroGoals: { calories, protein, carbs, fats },
    taperGoal: TAPER[a.goal],
    restSeconds: REST[a.goal],
    routines,
  }
}
