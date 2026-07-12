import { test } from 'node:test'
import assert from 'node:assert/strict'
import { statusEffects, localDayKey } from '../src/state/streak.ts'
import type { Battle } from '../src/state/streak.ts'

/* ================================================================
   THE UNBROKEN CHAIN — streak derivation, with and without burned
   embers bridging rest days. All dates are built relative to "now"
   so the suite is stable on any day it runs.
   ================================================================ */

const DAY = 86_400_000
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString()
const key = (daysAgo: number) => localDayKey(iso(daysAgo))

const battle = (daysAgo: number): Battle => ({
  id: `b-${daysAgo}`,
  movement: 'Squat',
  date: iso(daysAgo),
  sets: [{ weight: 135, reps: 5 }],
  topWeight: 135,
  topReps: 5,
  e1rm: 158,
  volume: 675,
  newPR: false,
})

test('no battles: streak 0, daysSinceLast null', () => {
  const s = statusEffects([])
  assert.equal(s.streak, 0)
  assert.equal(s.daysSinceLast, null)
})

test('trained today and yesterday: streak 2', () => {
  const s = statusEffects([battle(0), battle(1)])
  assert.equal(s.streak, 2)
  assert.equal(s.daysSinceLast, 0)
})

test('a one-day gap with no ember kills the streak', () => {
  // trained 2 and 3 days ago, idle since — the chain no longer reaches today/yesterday
  const s = statusEffects([battle(2), battle(3)])
  assert.equal(s.streak, 0)
})

test('a burned ember bridges the gap without inflating the count', () => {
  // battle yesterday-1? no: battles 2 and 3 days ago, burn covers yesterday (1 day ago)
  const s = statusEffects([battle(2), battle(3)], [key(1)])
  assert.equal(s.streak, 2) // two battle days — the burn day itself adds nothing
})

test('two burns bridge a two-day gap', () => {
  const s = statusEffects([battle(3), battle(4)], [key(1), key(2)])
  assert.equal(s.streak, 2)
})

test('a burn cannot save a chain whose gap it does not fully cover', () => {
  // battles 3 and 4 days ago, only one burn (2 days ago) — yesterday is still a hole
  const s = statusEffects([battle(3), battle(4)], [key(2)])
  assert.equal(s.streak, 0)
})

test('burns interleaved: battle-burn-battle counts both battles', () => {
  const s = statusEffects([battle(0), battle(2)], [key(1)])
  assert.equal(s.streak, 2)
})

test('ascension buff (3-day streak) survives across a burn', () => {
  // battles today, 2 and 3 days ago; burn covers 1 day ago
  const s = statusEffects([battle(0), battle(2), battle(3)], [key(1)])
  assert.equal(s.streak, 3)
  assert.equal(s.ascended, true)
})

test('the curse reads raw idle days — burns do not shield it', () => {
  // last battle 5 days ago; burns cover the whole gap, streak survives…
  const burns = [key(1), key(2), key(3), key(4)]
  const s = statusEffects([battle(5)], burns)
  assert.equal(s.cursed, true) // …but the curse still takes hold at 4+ idle days
})

test('stray burn days with no adjacent battles grant nothing', () => {
  const s = statusEffects([battle(6)], [key(1)])
  assert.equal(s.streak, 0)
})
