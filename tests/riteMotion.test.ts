/* ================================================================
   RITE MOTION — the rig and the timelines must keep their oaths.
   Solver invariants (bone lengths, planted feet, reachable bars),
   engine behavior (holds, looping, easing endpoints), and full
   catalog coverage. Run: npm test
   ================================================================ */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EXERCISES } from '../src/state/exercises.ts'
import {
  FLOOR,
  L,
  cycleLength,
  dist,
  ik,
  sample,
  solve,
} from '../src/motion/rig.ts'
import type { Timeline } from '../src/motion/rig.ts'
import { AUTHORED_RITES, COMPOUND_KEYFRAMES, timelineFor } from '../src/motion/timelines.ts'

const names = EXERCISES.map((e) => e.name)
const near = (a: number, b: number, eps = 0.6) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a.toFixed(2)} ≈ ${b.toFixed(2)}`)

/* ---- coverage --------------------------------------------------- */

test('every rite in the catalog has an authored timeline (no fallbacks)', () => {
  const authored = new Set(AUTHORED_RITES)
  for (const n of names) assert.ok(authored.has(n), `unauthored rite: ${n}`)
})

test('no timeline is authored for a rite that left the catalog', () => {
  const catalog = new Set(names)
  for (const n of AUTHORED_RITES) assert.ok(catalog.has(n), `orphaned timeline: ${n}`)
})

test('the five great compounds are exposed for tuning', () => {
  for (const n of ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row'])
    assert.ok(COMPOUND_KEYFRAMES[n], n)
})

/* ---- solver invariants, across every rite and many phases ------- */

const PHASES = (tl: Timeline) => {
  const total = cycleLength(tl)
  return Array.from({ length: 24 }, (_, i) => (i / 24) * total)
}

test('bone lengths hold at every phase of every rite', () => {
  for (const n of names) {
    const tl = timelineFor(n)
    for (const t of PHASES(tl)) {
      const s = solve(tl, sample(tl, t))
      near(dist(s.shoulder, s.elbow), L.upperArm)
      near(dist(s.elbow, s.hand), L.forearm)
      if (tl.staging !== 'bench') {
        near(dist(s.ankle, s.knee), L.shin)
        near(dist(s.knee, s.hip), L.thigh)
        near(dist(s.hip, s.shoulder), L.spine)
      }
    }
  }
})

test('standing rites keep the foot planted on the floor', () => {
  for (const n of names) {
    const tl = timelineFor(n)
    if (tl.staging !== 'standing') continue
    for (const t of PHASES(tl)) {
      const s = solve(tl, sample(tl, t))
      near(s.ankle[1], FLOOR, 0.01)
    }
  }
})

test('every joint stays inside the viewBox at every phase', () => {
  for (const n of names) {
    const tl = timelineFor(n)
    for (const t of PHASES(tl)) {
      const s = solve(tl, sample(tl, t))
      for (const p of [s.ankle, s.knee, s.hip, s.shoulder, s.head, s.elbow, s.hand, s.bar])
        assert.ok(p[0] > -4 && p[0] < 164 && p[1] > -4 && p[1] < 150, `${n}: joint out of frame at t=${t.toFixed(2)} (${p[0].toFixed(1)},${p[1].toFixed(1)})`)
    }
  }
})

test('hands-mode bars stay within arm reach (ember rides the hand)', () => {
  for (const n of names) {
    const tl = timelineFor(n)
    if (tl.barMode !== 'hands') continue
    for (const t of PHASES(tl)) {
      const s = solve(tl, sample(tl, t))
      near(dist(s.bar, s.hand), 0, 0.01) // bar IS the (clamped) hand
    }
  }
})

/* ---- anatomical spot checks on the compounds --------------------- */

test('squat: hips travel down AND back; bar path near-vertical on the back', () => {
  const tl = COMPOUND_KEYFRAMES.Squat
  const top = solve(tl, tl.keys[0].p)
  const bottom = solve(tl, tl.keys[1].p)
  assert.ok(bottom.hip[1] > top.hip[1] + 12, 'hips must sink')
  assert.ok(bottom.hip[0] < top.hip[0], 'hips must travel back')
  assert.ok(bottom.knee[0] > top.knee[0] + 10, 'knees must track forward')
  assert.ok(Math.abs(bottom.bar[0] - top.bar[0]) < 8, 'bar drift must stay small')
})

test('deadlift: flat-back hinge, bar tracks close to the legs', () => {
  const tl = COMPOUND_KEYFRAMES.Deadlift
  const top = solve(tl, tl.keys[0].p)
  const bottom = solve(tl, tl.keys[1].p)
  assert.ok(bottom.shoulder[1] > top.shoulder[1] + 15, 'shoulders must drop into the hinge')
  assert.ok(Math.abs(bottom.bar[0] - top.bar[0]) < 6, 'bar path near-vertical')
  assert.ok(Math.abs(bottom.bar[0] - bottom.knee[0]) < 8, 'bar stays close to the legs')
})

test('overhead press: bar travels a near-vertical line to lockout', () => {
  const tl = COMPOUND_KEYFRAMES['Overhead Press']
  const lock = solve(tl, tl.keys[0].p)
  const rack = solve(tl, tl.keys[1].p)
  assert.ok(rack.bar[1] - lock.bar[1] > 30, 'the bar must travel overhead')
  assert.ok(Math.abs(rack.bar[0] - lock.bar[0]) < 8, 'bar path near-vertical')
  assert.ok(lock.bar[1] < lock.head[1], 'lockout is above the crown')
})

test('row: the torso holds its hinge while the bar travels', () => {
  const tl = COMPOUND_KEYFRAMES['Barbell Row']
  const a = solve(tl, tl.keys[0].p)
  const b = solve(tl, tl.keys[1].p)
  near(a.hip[0], b.hip[0], 0.01)
  near(a.shoulder[1], b.shoulder[1], 0.01)
  assert.ok(b.bar[1] - a.bar[1] > 18, 'the bar must travel to the waist')
})

test('bench: bar presses from mid-chest to lockout over the shoulder', () => {
  const tl = COMPOUND_KEYFRAMES['Bench Press']
  const lock = solve(tl, tl.keys[0].p)
  const chest = solve(tl, tl.keys[1].p)
  assert.ok(chest.bar[1] - lock.bar[1] > 25, 'the bar must travel')
  assert.ok(chest.elbow[1] > chest.shoulder[1], 'elbow sinks below the shoulder at the chest')
  assert.ok(lock.elbow[1] < chest.elbow[1], 'elbow extends at lockout')
})

test('curl: the elbow stays pinned while the forearm arcs', () => {
  const tl = timelineFor('Barbell Curl')
  const down_ = solve(tl, tl.keys[1].p)
  const up_ = solve(tl, tl.keys[0].p)
  assert.ok(dist(down_.elbow, up_.elbow) < 10, 'elbow drift must stay small')
  assert.ok(down_.bar[1] - up_.bar[1] > 25, 'the bar must arc upward')
})

/* ---- engine behavior --------------------------------------------- */

test('sample: holds park exactly on the keys; the loop is seamless', () => {
  const tl = COMPOUND_KEYFRAMES.Deadlift
  const [k0, k1] = tl.keys
  /* mid-hold of key 0: exactly the lockout pose */
  const held = sample(tl, k0.move + k0.hold / 2)
  assert.deepEqual(held.bar, k0.p.bar)
  /* mid-hold of key 1: exactly the bottom pose */
  const held1 = sample(tl, k0.move + k0.hold + k1.move + k1.hold / 2)
  assert.deepEqual(held1.bar, k1.p.bar)
  /* wraparound: t and t + cycle are identical */
  const t = 0.77
  assert.deepEqual(sample(tl, t), sample(tl, t + cycleLength(tl)))
})

test('sample: easing lands exactly on the endpoints', () => {
  const tl = COMPOUND_KEYFRAMES.Squat
  const start = sample(tl, 0)
  assert.deepEqual(start.bar, tl.keys[1].p.bar) // t=0 departs the bottom key
  const atKey0 = sample(tl, tl.keys[0].move)
  assert.deepEqual(atKey0.bar, tl.keys[0].p.bar)
})

test('every timeline has sane timing (moves > 0, a hold at each end)', () => {
  for (const n of names) {
    const tl = timelineFor(n)
    assert.ok(tl.keys.length >= 2, `${n}: needs at least two keys`)
    for (const k of tl.keys) {
      assert.ok(k.move > 0, `${n}: zero move`)
      assert.ok(k.hold >= 0.15, `${n}: the pause must read (hold ≥ 0.15s)`)
    }
    assert.ok(cycleLength(tl) >= 1.5 && cycleLength(tl) <= 6, `${n}: cycle out of range`)
  }
})

/* ---- ik ----------------------------------------------------------- */

test('ik: preserves bone lengths, respects bend side, clamps reach', () => {
  const S: [number, number] = [50, 50]
  const { E, W } = ik(S, [70, 80], 20, 20, 1)
  near(dist(S, E), 20)
  near(dist(E, W), 20)
  const flipped = ik(S, [70, 80], 20, 20, -1)
  assert.ok(dist(E, flipped.E) > 1, 'bend sides must differ')
  /* out of reach: hand clamps to the straight-arm point toward the target */
  const far = ik(S, [50, 200], 20, 20, 1)
  near(dist(S, far.W), 39.5)
  near(far.W[0], 50)
})
