import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readSignals } from '../src/coach/signals.ts'
import type { FatigueMap } from '../src/state/recovery.ts'

const DAY = 86_400_000
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString()

const battle = (movement: string, topWeight: number, daysAgo: number, e1rm = topWeight) => ({
  id: `t-${movement}-${daysAgo}`,
  movement,
  date: iso(daysAgo),
  sets: [
    { weight: topWeight, reps: 5 },
    { weight: topWeight, reps: 5 },
    { weight: topWeight, reps: 5 },
  ],
  topWeight,
  topReps: 5,
  e1rm,
  volume: topWeight * 15,
  newPR: false,
})

const COOL: FatigueMap = { Shoulders: 0, Chest: 0, Back: 0, Core: 0, Legs: 0, Arms: 0 }
const LEGS_HOT: FatigueMap = { ...COOL, Legs: 0.8 }

const LOOKUPS = {
  primaryOf: (m: string) => ({ Squat: 'Legs', 'Bench Press': 'Chest' })[m],
  standardOf: (m: string) => ({ Squat: 1.5, 'Bench Press': 1.0 })[m],
}

test('progressing lift → advance by the smallest plate, in the right units', () => {
  const battles = [battle('Squat', 235, 1, 260), battle('Squat', 230, 4, 254), battle('Squat', 225, 7, 248)]
  const s = readSignals(battles, { Squat: 235 }, 180, COOL, 'lb', LOOKUPS)
  const squat = s.lifts.find((l) => l.movement === 'Squat')!
  assert.equal(squat.stalled, false)
  assert.deepEqual(squat.nextMove, { kind: 'advance', addWeight: 5 })
  assert.ok(squat.velocity > 0)

  const kg = readSignals(battles, { Squat: 235 }, 180, COOL, 'kg', LOOKUPS)
  assert.deepEqual(kg.lifts[0].nextMove, { kind: 'advance', addWeight: 2.5 })
})

test('e1RM plateau + hot muscle → deload with bounded numbers (matches the Fading Flame)', () => {
  const battles = [battle('Squat', 225, 1, 248), battle('Squat', 225, 4, 248), battle('Squat', 225, 7, 248)]
  const s = readSignals(battles, { Squat: 225 }, 180, LEGS_HOT, 'lb', LOOKUPS)
  const squat = s.lifts[0]
  assert.equal(squat.stalled, true)
  assert.equal(squat.nextMove.kind, 'deload')
  if (squat.nextMove.kind === 'deload') {
    assert.equal(squat.nextMove.toWeight, Math.round((225 * 0.9) / 5) * 5)
    assert.equal(squat.nextMove.toSets, 2)
    assert.ok(squat.nextMove.toWeight < 225)
  }
  assert.equal(s.deloads.length, 1)
  assert.equal(s.focus?.movement, 'Squat')
})

test('same plateau but cool muscle → hold, never deload', () => {
  const battles = [battle('Squat', 225, 3, 248), battle('Squat', 225, 8, 248), battle('Squat', 225, 13, 248)]
  const s = readSignals(battles, { Squat: 225 }, 180, COOL, 'lb', LOOKUPS)
  assert.equal(s.lifts[0].stalled, true)
  assert.equal(s.lifts[0].nextMove.kind, 'hold')
  assert.equal(s.deloads.length, 0)
})

test('a fresh best e1RM is never called a stall', () => {
  const battles = [battle('Bench Press', 190, 1, 212), battle('Bench Press', 185, 4, 207), battle('Bench Press', 185, 8, 207)]
  const s = readSignals(battles, { 'Bench Press': 190 }, 180, COOL, 'lb', LOOKUPS)
  assert.equal(s.lifts[0].stallLen, 0)
  assert.equal(s.lifts[0].stalled, false)
})

test('five silent days → adherence drift flagged; steady cadence is not', () => {
  const drifted = readSignals([battle('Squat', 225, 6, 248)], { Squat: 225 }, 180, COOL, 'lb', LOOKUPS)
  assert.equal(drifted.adherence.drifting, true)
  assert.equal(drifted.adherence.daysSinceLast, 6)

  const steady = readSignals(
    [battle('Squat', 225, 1, 248), battle('Bench Press', 185, 3, 207), battle('Squat', 220, 5, 243)],
    { Squat: 225 },
    180,
    COOL,
    'lb',
    LOOKUPS
  )
  assert.equal(steady.adherence.drifting, false)
})

test('weakest lift is judged against the catalog standards, per bodyweight', () => {
  const battles = [battle('Squat', 315, 1, 348), battle('Bench Press', 135, 2, 151)]
  const s = readSignals(battles, { Squat: 315, 'Bench Press': 135 }, 180, COOL, 'lb', LOOKUPS)
  assert.equal(s.weakest?.movement, 'Bench Press')
  assert.equal(s.weakest?.target, 180)
  assert.ok(s.weakest!.pct < 100)
})

test('no battles → empty, safe signals', () => {
  const s = readSignals([], {}, 180, COOL, 'lb', LOOKUPS)
  assert.equal(s.lifts.length, 0)
  assert.equal(s.focus, undefined)
  assert.equal(s.adherence.drifting, false)
})
