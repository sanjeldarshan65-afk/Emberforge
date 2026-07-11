/* ================================================================
   NUTRITION MATH — the single source of truth for the Estus
   Rations arithmetic. Pure and dependency-free so it can be unit
   tested directly (see tests/nutrition.test.ts).

   Contract: for each macro,
     consumed  = sum of that macro across the day's logged rations
     remaining = max(0, goal − consumed)     (what the counter shows)
     overage   = max(0, consumed − goal)     (shown once past the goal,
                 so the counter never *looks* like it lost grams)
   ================================================================ */

export type MacroSet = { calories: number; protein: number; carbs: number; fats: number }
export type DatedRation = MacroSet & { date: string }

export const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fats'] as const

/** Sum a day's consumed macros from the rations log. */
export function sumConsumed(rations: DatedRation[], day: string): MacroSet {
  const t: MacroSet = { calories: 0, protein: 0, carbs: 0, fats: 0 }
  for (const r of rations) {
    if (r.date !== day) continue
    t.calories += r.calories
    t.protein += r.protein
    t.carbs += r.carbs
    t.fats += r.fats
  }
  return t
}

/** What the counter shows: goal − consumed, floored at zero. */
export const remainingOf = (goal: number, used: number) => Math.max(0, goal - used)

/** Grams past the goal, floored at zero. */
export const overageOf = (goal: number, used: number) => Math.max(0, used - goal)

/** Remaining for all four macros at once. */
export function remainingAll(goals: MacroSet, consumed: MacroSet): MacroSet {
  return {
    calories: remainingOf(goals.calories, consumed.calories),
    protein: remainingOf(goals.protein, consumed.protein),
    carbs: remainingOf(goals.carbs, consumed.carbs),
    fats: remainingOf(goals.fats, consumed.fats),
  }
}

/** Flask fill percentage (may exceed 100; the flask clamps visually). */
export const flaskPctOf = (goalCalories: number, usedCalories: number) =>
  goalCalories > 0 ? (usedCalories / goalCalories) * 100 : 0

/**
 * Invariant check: every displayed "remaining" value must equal
 * goal − sum(day's log), clamped at zero. Returns the list of
 * violations (empty = consistent). Wired into the Rations tab in
 * dev builds after every log change.
 */
export function macroConsistencyViolations(
  goals: MacroSet,
  rations: DatedRation[],
  day: string,
  displayed: { consumed: MacroSet; remaining: MacroSet }
): string[] {
  const truth = sumConsumed(rations, day)
  const out: string[] = []
  for (const k of MACRO_KEYS) {
    if (displayed.consumed[k] !== truth[k])
      out.push(`${k}: displayed consumed ${displayed.consumed[k]} ≠ log sum ${truth[k]}`)
    const want = remainingOf(goals[k], truth[k])
    if (displayed.remaining[k] !== want)
      out.push(`${k}: displayed remaining ${displayed.remaining[k]} ≠ goal−consumed ${want}`)
  }
  return out
}
