/* ================================================================
   RITE MOTION v2 — animated form demonstrations, sketched by the
   Fire Keeper. A properly articulated stick figure performs each
   rep in a slow loop, pausing a breath at lockout and at the
   bottom so both key positions read clearly.

   THE RIG
   Side view, facing right, viewBox 0 0 160 150. The skeleton is a
   real joint chain solved every frame:

     ankle ─ knee ─ hip ─ shoulder ─ head        (leg + spine)
                          └ elbow ─ hand         (arm)

   Legs are forward-kinematics from the planted ankle upward
   (ankle → knee → hip), so hips genuinely travel down-and-back in
   a squat while the feet stay rooted. The spine is a segment off
   the hip with its own lean, so the torso hinges independently
   (deadlift) or stays upright (front squat). Arms are two-bone IK:
   each keyframe authors the BAR position and the solver bends the
   elbow to reach it — which means the bar path is authored
   directly (near-vertical lines for squat/press/deadlift) and the
   implement is truly attached to the hands (or riding the upper
   back, for back squats).

   A far-side leg and arm are drawn dim and slightly offset for
   depth; joints get visible dots; each staging carries its props
   (floor line, bench, pull-up bar) plus a faint dashed bar-path
   guide.

   THE ENGINE
   requestAnimationFrame interpolates numeric pose fields between
   keyframes (cubic ease-in-out) with per-key hold times. No SMIL,
   no libraries. Runs only while mounted (the Codex modal) and
   pauses when the document is hidden. prefers-reduced-motion holds
   the lockout pose, ember steady. All colors are CSS variables, so
   normal and Hollowed Mode both theme correctly.

   STATUS: the five great compounds (Squat, Bench Press, Deadlift,
   Overhead Press, Barbell Row) are fully authored below in
   COMPOUND_KEYFRAMES — exposed and commented for tuning. Every
   other rite falls back to a quiet ember-breath until the rig is
   approved and the remaining poses are scribed.
   ================================================================ */

import { useEffect, useMemo, useRef } from 'react'

/* ---- skeleton dimensions (px in the 160×150 world) ------------- */

const L = {
  shin: 26,
  thigh: 26,
  spine: 32,
  upperArm: 20,
  forearm: 20,
  foot: 12,
  neck: 12, // shoulder → head center
  headR: 7,
}

const FLOOR = 140

/* ---- pose & timeline types -------------------------------------
   Angles in degrees. Convention (side view, facing right / +x):
     shin  — lean of the shin from vertical; positive = knee forward
     thigh — lean of knee→hip from vertical; NEGATIVE = hips back
     torso — lean of the spine from vertical; positive = lean forward
     bar   — absolute [x, y] the hands (and implement) reach for;
             the elbow is IK-solved. If out of reach the arm goes
             straight toward it and the bar rides at the hands.
     bend  — elbow bend side: +1 or -1 (which way the elbow points)
   ---------------------------------------------------------------- */

export type Pose = {
  ankleX: number
  shin: number
  thigh: number
  torso: number
  bar: [number, number]
  bend: 1 | -1
}

type Key = {
  p: Pose
  move: number // seconds travelling INTO this key from the previous
  hold: number // seconds paused here (the breath at top / bottom)
}

type Staging = 'standing' | 'bench'
type BarMode = 'hands' | 'back'

export type Timeline = {
  staging: Staging
  barMode: BarMode
  keys: Key[] // looped; key 0 is also the reduced-motion still
}

const AX = 74 // default planted ankle
const P = (p: Partial<Pose>): Pose => ({
  ankleX: AX,
  shin: 0,
  thigh: 0,
  torso: 0,
  bar: [AX + 2, 96],
  bend: 1,
  ...p,
})

/* ================================================================
   COMPOUND KEYFRAMES — the five great lifts, exposed for tuning.
   key 0 = lockout / top (also the reduced-motion pose)
   key 1 = bottom. Tweak angles & bar coords freely; the solver
   does the rest. move/hold are seconds.
   ================================================================ */

export const COMPOUND_KEYFRAMES: Record<string, Timeline> = {
  /* back squat — bar rides the upper back (barMode 'back'); hips
     sink down-and-back, knees track forward over the toes, torso
     inclines ~30°, bar drops in a near-vertical line */
  Squat: {
    staging: 'standing',
    barMode: 'back',
    keys: [
      { p: P({ shin: 3, thigh: 0, torso: 7, bend: -1 }), move: 1.15, hold: 0.45 },
      { p: P({ shin: 40, thigh: -55, torso: 26, bend: -1 }), move: 1.3, hold: 0.4 },
    ],
  },

  /* bench press — lying staging; bar touches mid-chest and presses
     up-and-slightly-back over the shoulder as the elbows extend */
  'Bench Press': {
    staging: 'bench',
    barMode: 'hands',
    keys: [
      { p: P({ bar: [66, 60], bend: -1 }), move: 1.05, hold: 0.45 }, // lockout over the shoulder
      { p: P({ bar: [74, 92], bend: -1 }), move: 1.2, hold: 0.4 }, // bar at mid-chest, elbow sunk toward the feet
    ],
  },

  /* deadlift — pure hip hinge, flat back; the bar hangs from long
     arms and tracks a vertical line up the legs to a tall lockout */
  Deadlift: {
    staging: 'standing',
    barMode: 'hands',
    keys: [
      { p: P({ shin: 0, thigh: 0, torso: 4, bar: [78, 96], bend: 1 }), move: 1.2, hold: 0.55 }, // lockout, bar at thigh
      { p: P({ shin: 22, thigh: -35, torso: 62, bar: [80, 118], bend: 1 }), move: 1.25, hold: 0.4 }, // bar below knees
    ],
  },

  /* overhead press — upright, slight layback at lockout; the bar
     travels a vertical line from the rack at the collar to overhead */
  'Overhead Press': {
    staging: 'standing',
    barMode: 'hands',
    keys: [
      { p: P({ torso: -8, bar: [72, 17], bend: -1 }), move: 1.1, hold: 0.5 }, // locked overhead
      { p: P({ torso: -3, bar: [78, 53], bend: -1 }), move: 1.0, hold: 0.5 }, // racked at the collar, elbows beneath the bar
    ],
  },

  /* barbell row — torso hinged and HELD (the drawbridge, lowered
     and locked); only the bar moves: dead hang → torn to the waist */
  'Barbell Row': {
    staging: 'standing',
    barMode: 'hands',
    keys: [
      { p: P({ shin: 15, thigh: -28, torso: 55, bar: [86, 87], bend: -1 }), move: 1.0, hold: 0.45 }, // bar at the waist
      { p: P({ shin: 15, thigh: -28, torso: 55, bar: [92, 112], bend: -1 }), move: 0.95, hold: 0.4 }, // dead hang
    ],
  },
}

/* the quiet fallback for rites not yet scribed on the new rig —
   a standing ember-breath with the implement held at the thigh */
const EMBER: Timeline = {
  staging: 'standing',
  barMode: 'hands',
  keys: [
    { p: P({ torso: 2, bar: [78, 96], bend: 1 }), move: 1.7, hold: 0.25 },
    { p: P({ shin: 3, thigh: -4, torso: 5, bar: [79, 100], bend: 1 }), move: 1.7, hold: 0.25 },
  ],
}

export const timelineFor = (name: string): Timeline => COMPOUND_KEYFRAMES[name] ?? EMBER

/* ---- the solver ------------------------------------------------- */

type Pt = [number, number]

const rad = (d: number) => (d * Math.PI) / 180
/** unit vector `deg` from vertical-UP, positive tilting toward +x */
const up = (deg: number): Pt => [Math.sin(rad(deg)), -Math.cos(rad(deg))]
const add = (a: Pt, b: Pt, s: number): Pt => [a[0] + b[0] * s, a[1] + b[1] * s]

/** two-bone IK: shoulder S reaches for W; returns elbow + clamped hand */
function ik(S: Pt, W: Pt, l1: number, l2: number, bend: 1 | -1): { E: Pt; W: Pt } {
  const dx = W[0] - S[0]
  const dy = W[1] - S[1]
  const d = Math.max(0.01, Math.hypot(dx, dy))
  const dm = Math.min(d, l1 + l2 - 0.5) // clamp: straight arm toward the target
  const w: Pt = [S[0] + (dx / d) * dm, S[1] + (dy / d) * dm]
  const a = (l1 * l1 - l2 * l2 + dm * dm) / (2 * dm)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const mx = S[0] + ((w[0] - S[0]) * a) / dm
  const my = S[1] + ((w[1] - S[1]) * a) / dm
  const E: Pt = [mx + (bend * h * (w[1] - S[1])) / dm, my - (bend * h * (w[0] - S[0])) / dm]
  return { E, W: w }
}

type Solved = {
  ankle: Pt
  knee: Pt
  hip: Pt
  shoulder: Pt
  head: Pt
  elbow: Pt
  hand: Pt
  bar: Pt
}

/* bench staging anchors — the lying body is static; only the arm solves */
const BENCH = { shoulder: [66, 97] as Pt }

function solve(tl: Timeline, p: Pose): Solved {
  if (tl.staging === 'bench') {
    const S = BENCH.shoulder
    const { E, W } = ik(S, p.bar, L.upperArm, L.forearm, p.bend)
    return { ankle: [0, 0], knee: [0, 0], hip: [0, 0], shoulder: S, head: [44, 94], elbow: E, hand: W, bar: W }
  }
  /* legs: FK from the planted ankle upward */
  const ankle: Pt = [p.ankleX, FLOOR]
  const knee = add(ankle, up(p.shin), L.shin)
  const hip = add(knee, up(p.thigh), L.thigh)
  /* spine + head (neck stays near-neutral against the torso lean) */
  const shoulder = add(hip, up(p.torso), L.spine)
  const head = add(shoulder, up(p.torso * 0.5), L.neck)
  /* the implement */
  const bar: Pt = tl.barMode === 'back' ? [shoulder[0] + 3, shoulder[1] - 2] : p.bar
  /* arms reach the bar (for back squats, the hands grip just behind it) */
  const target: Pt = tl.barMode === 'back' ? [bar[0] + 6, bar[1] + 6] : bar
  const { E, W } = ik(shoulder, target, L.upperArm, L.forearm, p.bend)
  return { ankle, knee, hip, shoulder, head, elbow: E, hand: W, bar: tl.barMode === 'back' ? bar : W }
}

/* ---- the engine ------------------------------------------------- */

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function mixPose(a: Pose, b: Pose, t: number): Pose {
  return {
    ankleX: lerp(a.ankleX, b.ankleX, t),
    shin: lerp(a.shin, b.shin, t),
    thigh: lerp(a.thigh, b.thigh, t),
    torso: lerp(a.torso, b.torso, t),
    bar: [lerp(a.bar[0], b.bar[0], t), lerp(a.bar[1], b.bar[1], t)],
    bend: b.bend,
  }
}

/** pose at wall-clock second `s` of the looping timeline */
function sample(tl: Timeline, s: number): Pose {
  const keys = tl.keys
  const total = keys.reduce((t, k) => t + k.move + k.hold, 0)
  let u = s % total
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

/* ---- rendering -------------------------------------------------- */

const pts = (...ps: Pt[]) => ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

const STROKE = {
  stroke: 'var(--color-stone)',
  strokeWidth: 4.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
}

function Joint({ id, cx, cy }: { id?: string; cx?: number; cy?: number }) {
  return (
    <circle
      data-n={id}
      cx={cx}
      cy={cy}
      r="2.4"
      fill="var(--color-charcoal)"
      stroke="var(--color-stone)"
      strokeWidth="1.4"
    />
  )
}

/* the implement — an end-on plate of ember, pulsing from the rAF loop */
function Ember() {
  return (
    <g data-ember>
      <circle r={7.5} fill="none" stroke="var(--color-ember)" strokeWidth="1.2" opacity={0.35} />
      <circle r={6} fill="var(--color-ember)" opacity={0.22} />
      <circle data-ember-core r={3.4} fill="var(--color-ember)" opacity={0.85} />
    </g>
  )
}

type NodeMap = Record<string, Element | null>

function applySolved(n: NodeMap, s: Solved, standing: boolean) {
  if (standing) {
    n.legN?.setAttribute('points', pts(s.ankle, s.knee, s.hip))
    n.legF?.setAttribute('points', pts([s.ankle[0] + 4, s.ankle[1]], [s.knee[0] + 4, s.knee[1]], [s.hip[0] + 4, s.hip[1]]))
    n.footN?.setAttribute('points', pts(s.ankle, [s.ankle[0] + L.foot, FLOOR]))
    n.footF?.setAttribute('points', pts([s.ankle[0] + 4, FLOOR], [s.ankle[0] + 4 + L.foot, FLOOR]))
    n.spine?.setAttribute('points', pts(s.hip, s.shoulder))
    n.head?.setAttribute('cx', String(s.head[0]))
    n.head?.setAttribute('cy', String(s.head[1]))
    for (const [id, p] of [
      ['jHip', s.hip],
      ['jKnee', s.knee],
      ['jAnkle', s.ankle],
    ] as [string, Pt][]) {
      n[id]?.setAttribute('cx', String(p[0]))
      n[id]?.setAttribute('cy', String(p[1]))
    }
  }
  n.armN?.setAttribute('points', pts(s.shoulder, s.elbow, s.hand))
  n.armF?.setAttribute(
    'points',
    pts([s.shoulder[0] + 4, s.shoulder[1]], [s.elbow[0] + 4, s.elbow[1]], [s.hand[0] + 4, s.hand[1]])
  )
  for (const [id, p] of [
    ['jShoulder', s.shoulder],
    ['jElbow', s.elbow],
  ] as [string, Pt][]) {
    n[id]?.setAttribute('cx', String(p[0]))
    n[id]?.setAttribute('cy', String(p[1]))
  }
  n.ember?.setAttribute('transform', `translate(${s.bar[0].toFixed(1)} ${s.bar[1].toFixed(1)})`)
}

/* ---- the component ---------------------------------------------- */

export default function RiteMotion({ name }: { name: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tl = useMemo(() => timelineFor(name), [name])

  /* the faint dashed bar-path guide, from key 0's bar to key 1's */
  const guide = useMemo(() => {
    const a = solve(tl, tl.keys[0].p).bar
    const b = solve(tl, tl.keys[tl.keys.length - 1].p).bar
    return { a, b }
  }, [tl])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const q = (id: string) => svg.querySelector(`[data-n="${id}"]`)
    const n: NodeMap = Object.fromEntries(
      ['legN', 'legF', 'footN', 'footF', 'spine', 'head', 'armN', 'armF', 'jHip', 'jKnee', 'jAnkle', 'jShoulder', 'jElbow', 'ember'].map(
        (id) => [id, q(id)]
      )
    )
    const emberCore = svg.querySelector('[data-ember-core]')
    const standing = tl.staging === 'standing'

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    applySolved(n, solve(tl, tl.keys[0].p), standing) // lockout still
    if (reduced) return

    let raf = 0
    let last = performance.now()
    let clock = 0 // pauses while the document is hidden

    const frame = (now: number) => {
      clock += (now - last) / 1000
      last = now
      applySolved(n, solve(tl, sample(tl, clock)), standing)
      emberCore?.setAttribute('opacity', String(0.7 + 0.3 * (0.5 + 0.5 * Math.sin(clock * 3.9))))
      raf = requestAnimationFrame(frame)
    }
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    raf = requestAnimationFrame(frame)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tl])

  const standing = tl.staging === 'standing'

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 160 150"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label={`form sketch: ${name}`}
    >
      {/* bar-path guide — the line the ember is sworn to */}
      <line
        x1={guide.a[0]}
        y1={guide.a[1]}
        x2={guide.b[0]}
        y2={guide.b[1]}
        stroke="var(--color-ember)"
        strokeWidth="1"
        strokeDasharray="1.5 4"
        opacity="0.3"
      />

      {standing ? (
        <>
          {/* the floor */}
          <line x1="20" y1={FLOOR + 1.5} x2="140" y2={FLOOR + 1.5} stroke="var(--color-ash)" strokeWidth="2" opacity="0.55" />
          <ellipse cx="80" cy={FLOOR + 5} rx="36" ry="3.5" fill="var(--color-ember)" opacity="0.07" />
          {/* far side, dim, offset for depth */}
          <g opacity="0.3">
            <polyline data-n="legF" {...STROKE} />
            <polyline data-n="footF" {...STROKE} strokeWidth={3.5} />
            <polyline data-n="armF" {...STROKE} strokeWidth={4} />
          </g>
          {/* near side */}
          <polyline data-n="legN" {...STROKE} />
          <polyline data-n="footN" {...STROKE} strokeWidth={3.5} />
          <polyline data-n="spine" {...STROKE} strokeWidth={5.5} />
          <circle data-n="head" r={L.headR} fill="var(--color-charcoal)" stroke="var(--color-stone)" strokeWidth="2.5" />
          <polyline data-n="armN" {...STROKE} strokeWidth={4} />
          {/* the joints, marked */}
          <Joint id="jAnkle" />
          <Joint id="jKnee" />
          <Joint id="jHip" />
          <Joint id="jShoulder" />
          <Joint id="jElbow" />
        </>
      ) : (
        <>
          {/* the bench and the lying body (head left, feet planted) */}
          <line x1="20" y1={FLOOR + 1.5} x2="140" y2={FLOOR + 1.5} stroke="var(--color-ash)" strokeWidth="2" opacity="0.55" />
          <rect x="32" y="104" width="74" height="7" fill="var(--color-iron)" stroke="var(--color-ash)" strokeWidth="1" />
          <line x1="42" y1="111" x2="42" y2={FLOOR} stroke="var(--color-ash)" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="96" y1="111" x2="96" y2={FLOOR} stroke="var(--color-ash)" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="44" cy="94" r={L.headR} fill="var(--color-charcoal)" stroke="var(--color-stone)" strokeWidth="2.5" />
          {/* torso on the bench, hip, bent legs to the floor */}
          <polyline points="53,97 92,99" {...STROKE} strokeWidth={5.5} />
          <polyline points="92,99 108,118 112,140" {...STROKE} />
          <polyline points="108,118 112,140 122,140" {...STROKE} strokeWidth={3.5} opacity={0} />
          <Joint cx={92} cy={99} />
          <Joint cx={108} cy={118} />
          {/* far arm, dim */}
          <g opacity="0.3">
            <polyline data-n="armF" {...STROKE} strokeWidth={4} />
          </g>
          {/* the pressing arm */}
          <polyline data-n="armN" {...STROKE} strokeWidth={4} />
          <Joint id="jShoulder" />
          <Joint id="jElbow" />
        </>
      )}

      {/* the ember group is translated to the bar position each frame */}
      <g data-n="ember">
        <Ember />
      </g>
    </svg>
  )
}
