/* ================================================================
   ESTUS RATIONS — macro math unit tests.
   Run: npm test   (node --test with type stripping; no deps)

   Guards the contract: remaining = goal − sum(day's log), per macro,
   the consumed value used by the bars is the same one shown on the
   food item, and add → remove returns every counter to its start.
   ================================================================ */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sumConsumed,
  remainingOf,
  remainingAll,
  overageOf,
  flaskPctOf,
  macroConsistencyViolations,
} from '../src/state/nutrition.ts'
import type { DatedRation, MacroSet } from '../src/state/nutrition.ts'

/* the defaults from store.ts, and a known codex item */
const GOALS: MacroSet = { calories: 2400, protein: 180, carbs: 220, fats: 75 }
const CHICKEN = { calories: 280, protein: 54, carbs: 0, fats: 6 } // Grilled Chicken Breast, as shown on its card
const DAY = '2026-07-10'

const log = (items: MacroSet[], date = DAY): DatedRation[] => items.map((m) => ({ ...m, date }))

test('logging a known meal: each remaining = goal − the exact macros on the item', () => {
  const consumed = sumConsumed(log([CHICKEN]), DAY)
  /* consumed must equal what the food card displays — no scaling, no rounding */
  assert.deepEqual(consumed, CHICKEN)

  const left = remainingAll(GOALS, consumed)
  assert.equal(left.calories, GOALS.calories - CHICKEN.calories) // 2120
  assert.equal(left.protein, GOALS.protein - CHICKEN.protein) // 126 — a 54g item moves it by 54
  assert.equal(left.carbs, GOALS.carbs - CHICKEN.carbs) // 220
  assert.equal(left.fats, GOALS.fats - CHICKEN.fats) // 69
})

test('add then remove: every counter returns exactly to its starting value', () => {
  const before = remainingAll(GOALS, sumConsumed([], DAY))
  const during = remainingAll(GOALS, sumConsumed(log([CHICKEN]), DAY))
  const after = remainingAll(GOALS, sumConsumed([], DAY)) // item removed from the log

  assert.deepEqual(before, GOALS) // empty day: remaining = goals
  assert.notDeepEqual(during, before)
  assert.deepEqual(after, before)
})

test('several items: remaining tracks the running sum, matching the day log', () => {
  const meals = [CHICKEN, { calories: 540, protein: 48, carbs: 58, fats: 12 }, CHICKEN]
  const consumed = sumConsumed(log(meals), DAY)
  assert.equal(consumed.protein, 54 + 48 + 54)
  assert.equal(remainingOf(GOALS.protein, consumed.protein), 180 - 156)
  assert.equal(remainingOf(GOALS.calories, consumed.calories), 2400 - 1100)
})

test('other days never leak into today', () => {
  const consumed = sumConsumed(
    [...log([CHICKEN]), ...log([CHICKEN, CHICKEN], '2026-07-09')],
    DAY
  )
  assert.equal(consumed.protein, 54)
})

test('crossing the goal clamps remaining at 0 and reports the overage', () => {
  /* the "wrong drop" scenario: 146g already eaten of a 180g goal leaves 34g;
     logging a 54g item can only move the visible counter by those 34g —
     the other 20g land in the overage, which the bar now displays */
  const already: MacroSet = { calories: 1800, protein: 146, carbs: 100, fats: 40 }
  const consumed = sumConsumed(log([already, CHICKEN]), DAY)
  assert.equal(consumed.protein, 200)
  assert.equal(remainingOf(GOALS.protein, consumed.protein), 0)
  assert.equal(overageOf(GOALS.protein, consumed.protein), 20)
  /* and the visible drop is exactly what remained, never negative */
  assert.equal(remainingOf(GOALS.protein, already.protein), 34)
})

test('flask percentage follows calories and may exceed 100 (clamped visually)', () => {
  assert.equal(flaskPctOf(2400, 0), 0)
  assert.equal(flaskPctOf(2400, 1200), 50)
  assert.equal(flaskPctOf(2400, 3000), 125)
  assert.equal(flaskPctOf(0, 500), 0) // no goal set: never divide by zero
})

test('consistency check passes for honest displays and catches drift', () => {
  const rations = log([CHICKEN])
  const consumed = sumConsumed(rations, DAY)
  const honest = { consumed, remaining: remainingAll(GOALS, consumed) }
  assert.deepEqual(macroConsistencyViolations(GOALS, rations, DAY, honest), [])

  /* a display that lost 20g of protein somewhere must be flagged */
  const drifted = {
    consumed: { ...consumed, protein: consumed.protein - 20 },
    remaining: { ...remainingAll(GOALS, consumed), protein: 146 },
  }
  const v = macroConsistencyViolations(GOALS, rations, DAY, drifted)
  assert.equal(v.length, 2)
  assert.match(v[0], /protein/)
})
