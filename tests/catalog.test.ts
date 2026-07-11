/* ================================================================
   CATALOG CONSISTENCY — every rite's muscle chips, category, and
   heatmap kindles must agree. Run: npm test
   ================================================================ */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EXERCISES } from '../src/state/exercises.ts'

/* display-muscle → heatmap region (includes the descriptive terms) */
const REGION: Record<string, string> = {
  Chest: 'Chest', 'Upper Chest': 'Chest', 'Lower Chest': 'Chest',
  Back: 'Back', Lats: 'Back', 'Upper Back': 'Back', 'Mid Back': 'Back', 'Lower Back': 'Back',
  Traps: 'Back', Rhomboids: 'Back', Erectors: 'Back', 'Posterior Chain': 'Back',
  'Front Delts': 'Shoulders', 'Side Delts': 'Shoulders', 'Rear Delts': 'Shoulders',
  Delts: 'Shoulders', Shoulders: 'Shoulders',
  Quads: 'Legs', Hamstrings: 'Legs', Glutes: 'Legs', Calves: 'Legs', Adductors: 'Legs', Legs: 'Legs',
  Biceps: 'Arms', Triceps: 'Arms', Forearms: 'Arms', Brachialis: 'Arms', Grip: 'Arms', Arms: 'Arms',
  Core: 'Core', Abs: 'Core', Obliques: 'Core', 'Hip Flexors': 'Core', 'Rectus Abdominis': 'Core',
}

test('every display muscle maps to a known heatmap region', () => {
  for (const e of EXERCISES)
    for (const m of [...e.primary, ...e.secondary])
      assert.ok(REGION[m], `${e.name}: unknown muscle name '${m}'`)
})

test("each rite's category appears among its kindles", () => {
  for (const e of EXERCISES) {
    const all = [...e.heat.primary, ...e.heat.secondary]
    assert.ok(all.includes(e.category), `${e.name}: category ${e.category} not kindled`)
  }
})

test('primary muscle chips land in the primary kindles; secondary chips anywhere in the kindles', () => {
  for (const e of EXERCISES) {
    for (const m of e.primary) {
      const r = REGION[m]
      assert.ok(
        e.heat.primary.includes(r as (typeof e.heat.primary)[number]),
        `${e.name}: primary '${m}' (${r}) missing from primary kindles [${e.heat.primary.join(',')}]`
      )
    }
    for (const m of e.secondary) {
      const r = REGION[m]
      const all = [...e.heat.primary, ...e.heat.secondary]
      assert.ok(all.includes(r as (typeof all)[number]), `${e.name}: secondary '${m}' (${r}) not kindled`)
    }
  }
})
