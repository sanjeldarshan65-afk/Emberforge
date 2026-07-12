import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RANKS, rankForLevel, nextRank, rankProgress } from '../src/state/ranks.ts'
import { dailyForDay, dailyProgress, DAILY_POOL } from '../src/state/daily.ts'
import { currentSeason, seasonReps, daysLeft } from '../src/state/season.ts'
import type { Battle } from '../src/state/store.ts'

/* ================================================================
   PROGRESSION LAYER — ranks, the Daily Ember, the Rite of the
   Season. Pure derivations; these pin their contracts down.
   ================================================================ */

/* ---------------- ranks ---------------- */

test('rank thresholds are strictly ascending from level 1', () => {
  assert.equal(RANKS[0].minLevel, 1)
  for (let i = 1; i < RANKS.length; i++) {
    assert.ok(RANKS[i].minLevel > RANKS[i - 1].minLevel)
  }
})

test('rankForLevel picks the highest attained tier', () => {
  assert.equal(rankForLevel(1).key, 'unkindled')
  assert.equal(rankForLevel(4).key, 'unkindled')
  assert.equal(rankForLevel(5).key, 'ashen')
  assert.equal(rankForLevel(39).key, 'emberlord')
  assert.equal(rankForLevel(40).key, 'titan-of-the-forge')
  assert.equal(rankForLevel(999).key, 'undying-flame')
})

test('nextRank returns the following tier, and null at the summit', () => {
  assert.equal(nextRank(1)?.key, 'ashen')
  assert.equal(nextRank(59)?.key, 'undying-flame')
  assert.equal(nextRank(60), null)
})

test('rankProgress is 0..1 and hits 1 at the summit', () => {
  assert.equal(rankProgress(1), 0)
  assert.ok(rankProgress(7) > 0 && rankProgress(7) < 1)
  assert.equal(rankProgress(60), 1)
})

/* ---------------- the Daily Ember ---------------- */

const DAY = 86_400_000
const isoDaysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString()
const todayKey = () => new Date().toLocaleDateString('en-CA')

const battleToday = (sets: { weight: number; reps: number }[]): Battle => ({
  id: 'b0',
  movement: 'Squat',
  date: isoDaysAgo(0),
  sets,
  topWeight: sets[0]?.weight ?? 0,
  topReps: sets[0]?.reps ?? 0,
  e1rm: 0,
  volume: sets.reduce((t, s) => t + s.weight * s.reps, 0),
  newPR: false,
})

test('dailyForDay is deterministic and drawn from the pool', () => {
  const k = '2026-07-11'
  const a = dailyForDay(k)
  const b = dailyForDay(k)
  assert.equal(a, b)
  assert.ok(DAILY_POOL.includes(a))
  // different days can differ (not asserted — hash collisions allowed), but
  // every day of a sample month must resolve to SOME pool entry
  for (let d = 1; d <= 28; d++) {
    const ember = dailyForDay(`2026-06-${String(d).padStart(2, '0')}`)
    assert.ok(DAILY_POOL.includes(ember))
  }
})

test('sets/volume progress reads only today', () => {
  const ctx = {
    battles: [battleToday([{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }])],
    rations: [],
    weighIns: [],
    macroGoals: { calories: 2400, protein: 180, carbs: 220, fats: 75 },
    dayKey: todayKey(),
  }
  const sets = dailyProgress({ kind: 'sets', name: '', charge: '', target: 9, unit: 'sets', souls: 0 }, ctx)
  assert.equal(sets.progress, 2)
  const vol = dailyProgress({ kind: 'volume', name: '', charge: '', target: 5000, unit: 'lb', souls: 0 }, ctx)
  assert.equal(vol.progress, 1000)
})

test('protein progress substitutes the macro goal as its target', () => {
  const ctx = {
    battles: [],
    rations: [{ id: 'r', name: 'x', date: todayKey(), calories: 500, protein: 42, carbs: 0, fats: 0 }],
    weighIns: [],
    macroGoals: { calories: 2400, protein: 150, carbs: 220, fats: 75 },
    dayKey: todayKey(),
  }
  const p = dailyProgress({ kind: 'protein', name: '', charge: '', target: 1, unit: 'g', souls: 0 }, ctx)
  assert.equal(p.target, 150)
  assert.equal(p.progress, 42)
})

test('weigh-in progress flips on a same-day entry only', () => {
  const base = { battles: [], rations: [], macroGoals: { calories: 0, protein: 0, carbs: 0, fats: 0 }, dayKey: todayKey() }
  const none = dailyProgress({ kind: 'weighIn', name: '', charge: '', target: 1, unit: '', souls: 0 }, { ...base, weighIns: [] })
  assert.equal(none.progress, 0)
  const yes = dailyProgress({ kind: 'weighIn', name: '', charge: '', target: 1, unit: '', souls: 0 }, { ...base, weighIns: [{ date: todayKey(), weight: 180 }] })
  assert.equal(yes.progress, 1)
})

/* ---------------- the Rite of the Season ---------------- */

test('the season window covers now, and daysLeft is positive within it', () => {
  const now = new Date()
  const s = currentSeason(now)
  assert.ok(s.start <= now && now < s.end)
  assert.ok(daysLeft(s, now) >= 1)
  assert.match(s.id, /^\d{4}-Q[1-4]$/)
})

test('seasonReps counts only battles inside the window', () => {
  const s = currentSeason()
  const inside: Battle = { ...battleToday([{ weight: 100, reps: 7 }]) }
  const outside: Battle = { ...inside, id: 'old', date: new Date(s.start.getTime() - DAY).toISOString() }
  assert.equal(seasonReps([inside, outside], s), 7)
})
