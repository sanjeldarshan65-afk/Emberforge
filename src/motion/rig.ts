/* ================================================================
   THE RIG — pure skeleton solver + keyframe engine for RiteMotion.
   No React, no DOM: everything here is unit-testable (tests/
   riteMotion.test.ts). The component in components/RiteMotion.tsx
   only renders what this module computes.

   Side view, facing right, world = viewBox 0 0 160 150.

   STAGINGS
   · standing — feet planted; legs are forward-kinematics from the
     ankle UP (ankle → knee → hip), so hips truly travel down-and-
     back while the feet stay rooted. Also serves prone work
     (push-up / plank): plant the ankle far right and lean the
     whole chain toward horizontal.
   · anchored — the hip position is authored per keyframe and legs
     are FK DOWN (hip → knee → ankle). Serves hanging (pull-up,
     dip, leg raise), seated (rows, pulldown, leg machines), and
     lifts where the pelvis itself is the mover (hip thrust,
     calf raise).
   · bench — lying press; the body is static staging, only the arm
     chain (two-bone IK) and the bar animate.

   ANGLES (degrees)
   · standing legs: shin / thigh are leans from vertical-UP along
     the chain (ankle→knee, knee→hip); positive tilts toward +x.
     thigh NEGATIVE = hips back.
   · anchored legs: thigh / shin are leans from vertical-DOWN
     (hip→knee, knee→ankle); positive swings the leg forward (+x).
   · torso: lean of hip→shoulder from vertical-up; positive =
     forward lean.

   THE BAR
   Keyframes author the BAR [x, y] directly and the arm bends by
   two-bone IK to reach it — so bar paths are authored as the
   near-vertical lines they should be, and the implement is truly
   attached to the hands. barMode:
   · 'hands' — ember rides at the hands (IK target = bar)
   · 'back'  — ember rides the upper back (back squat); hands grip
     just behind it
   · 'foot'  — ember rides at the working foot (leg machines); the
     bar field becomes a rest target for the hands
   If a target is out of reach the arm goes straight toward it and
   the ember rides at the hands (long-arm deadlifts, dead hangs).
   ================================================================ */

export type Pt = [number, number]

export type Staging = 'standing' | 'anchored' | 'bench'
export type BarMode = 'hands' | 'back' | 'foot'

export type Pose = {
  ankleX: number // standing: where the foot plants
  hip: Pt // anchored: authored pelvis position
  shin: number
  thigh: number
  torso: number
  bar: Pt
  bend: 1 | -1 // which side the elbow bends toward
}

export type Key = {
  p: Pose
  move: number // seconds travelling INTO this key from the previous
  hold: number // seconds paused here (the breath at top / bottom)
}

export type Timeline = {
  staging: Staging
  barMode: BarMode
  seat?: boolean // draw a block under the key-0 hip (anchored)
  overheadBar?: Pt // draw a grip bar centered here (pull-up, dip)
  keys: Key[] // looped; key 0 doubles as the reduced-motion still
}

/* ---- skeleton dimensions (px) ---------------------------------- */

export const L = {
  shin: 26,
  thigh: 26,
  spine: 32,
  upperArm: 20,
  forearm: 20,
  foot: 12,
  neck: 12, // shoulder → head center
  headR: 7,
}

export const FLOOR = 140
export const AX = 74 // default planted ankle

export const P = (p: Partial<Pose>): Pose => ({
  ankleX: AX,
  hip: [AX, FLOOR - L.shin - L.thigh],
  shin: 0,
  thigh: 0,
  torso: 0,
  bar: [AX + 4, 96],
  bend: 1,
  ...p,
})

/* ---- math ------------------------------------------------------- */

const rad = (d: number) => (d * Math.PI) / 180
/** unit vector `deg` from vertical-UP, positive toward +x */
export const up = (deg: number): Pt => [Math.sin(rad(deg)), -Math.cos(rad(deg))]
/** unit vector `deg` from vertical-DOWN, positive toward +x */
export const down = (deg: number): Pt => [Math.sin(rad(deg)), Math.cos(rad(deg))]
export const add = (a: Pt, b: Pt, s: number): Pt => [a[0] + b[0] * s, a[1] + b[1] * s]
export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** two-bone IK: S reaches for W; returns elbow + (reach-clamped) hand */
export function ik(S: Pt, W: Pt, l1: number, l2: number, bend: 1 | -1): { E: Pt; W: Pt } {
  const dx = W[0] - S[0]
  const dy = W[1] - S[1]
  const d = Math.max(0.01, Math.hypot(dx, dy))
  const dm = Math.min(d, l1 + l2 - 0.5)
  const w: Pt = [S[0] + (dx / d) * dm, S[1] + (dy / d) * dm]
  const a = (l1 * l1 - l2 * l2 + dm * dm) / (2 * dm)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const mx = S[0] + ((w[0] - S[0]) * a) / dm
  const my = S[1] + ((w[1] - S[1]) * a) / dm
  const E: Pt = [mx + (bend * h * (w[1] - S[1])) / dm, my - (bend * h * (w[0] - S[0])) / dm]
  return { E, W: w }
}

/* ---- the solver -------------------------------------------------- */

export type Solved = {
  ankle: Pt
  knee: Pt
  hip: Pt
  shoulder: Pt
  head: Pt
  elbow: Pt
  hand: Pt
  footTip: Pt
  bar: Pt // where the ember renders
}

/* bench staging anchors — the lying body is static */
export const BENCH_SHOULDER: Pt = [66, 97]

export function solve(tl: Timeline, p: Pose): Solved {
  if (tl.staging === 'bench') {
    const S = BENCH_SHOULDER
    const { E, W } = ik(S, p.bar, L.upperArm, L.forearm, p.bend)
    return {
      ankle: [112, FLOOR],
      knee: [108, 118],
      hip: [92, 99],
      shoulder: S,
      head: [44, 94],
      elbow: E,
      hand: W,
      footTip: [122, FLOOR],
      bar: W,
    }
  }

  let ankle: Pt, knee: Pt, hip: Pt, footTip: Pt
  if (tl.staging === 'standing') {
    ankle = [p.ankleX, FLOOR]
    knee = add(ankle, up(p.shin), L.shin)
    hip = add(knee, up(p.thigh), L.thigh)
    footTip = [p.ankleX + L.foot, FLOOR] // flat on the floor
  } else {
    hip = p.hip
    knee = add(hip, down(p.thigh), L.thigh)
    ankle = add(knee, down(p.shin), L.shin)
    /* foot points "forward" relative to the shin */
    const d = down(p.shin)
    footTip = add(ankle, [d[1], -d[0]] as Pt, L.foot)
  }

  const shoulder = add(hip, up(p.torso), L.spine)
  const head = add(shoulder, up(p.torso * 0.5), L.neck)

  const backBar: Pt = [shoulder[0] + 3, shoulder[1] - 2]
  const target: Pt = tl.barMode === 'back' ? [backBar[0] + 6, backBar[1] + 6] : p.bar
  const { E, W } = ik(shoulder, target, L.upperArm, L.forearm, p.bend)

  const bar: Pt = tl.barMode === 'back' ? backBar : tl.barMode === 'foot' ? ankle : W
  return { ankle, knee, hip, shoulder, head, elbow: E, hand: W, footTip, bar }
}

/* ---- the keyframe engine ----------------------------------------- */

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

export function mixPose(a: Pose, b: Pose, t: number): Pose {
  return {
    ankleX: lerp(a.ankleX, b.ankleX, t),
    hip: lerpPt(a.hip, b.hip, t),
    shin: lerp(a.shin, b.shin, t),
    thigh: lerp(a.thigh, b.thigh, t),
    torso: lerp(a.torso, b.torso, t),
    bar: lerpPt(a.bar, b.bar, t),
    bend: b.bend,
  }
}

export const cycleLength = (tl: Timeline) => tl.keys.reduce((t, k) => t + k.move + k.hold, 0)

/** pose at wall-clock second `s` of the looping timeline */
export function sample(tl: Timeline, s: number): Pose {
  const keys = tl.keys
  let u = ((s % cycleLength(tl)) + cycleLength(tl)) % cycleLength(tl)
  for (let i = 0; i < keys.length; i++) {
    const from = keys[(i - 1 + keys.length) % keys.length].p
    const k = keys[i]
    if (u < k.move) return mixPose(from, k.p, easeInOut(u / k.move))
    u -= k.move
    if (u < k.hold) return k.p // the breath at top / bottom
    u -= k.hold
  }
  return keys[0].p
}
