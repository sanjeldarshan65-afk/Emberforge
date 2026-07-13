/* ================================================================
   THE TIMELINES — keyframe pose data for every rite in the Codex.
   One entry per exercise name in src/state/exercises.ts (a unit
   test enforces full coverage). Families share a base; variants
   are tweaks. All coordinates live in the rig's 160×150 world —
   see src/motion/rig.ts for angle conventions.

   key 0 = lockout / top (also the reduced-motion still)
   key 1 = bottom / stretch. move & hold are seconds.
   ================================================================ */

import type { Pose, Timeline } from './rig.ts'
import { P } from './rig.ts'

type Patch = Partial<Pose>

/** two-key rep with the standard cadence */
const rep = (
  base: Omit<Timeline, 'keys'>,
  top: Patch,
  bottom: Patch,
  t?: { up?: number; down?: number; holdTop?: number; holdBottom?: number }
): Timeline => ({
  ...base,
  keys: [
    { p: P(top), move: t?.up ?? 1.1, hold: t?.holdTop ?? 0.45 },
    { p: P(bottom), move: t?.down ?? 1.2, hold: t?.holdBottom ?? 0.4 },
  ],
})

const standing = { staging: 'standing' as const, barMode: 'hands' as const }
const bench = { staging: 'bench' as const, barMode: 'hands' as const }
const seated = { staging: 'anchored' as const, barMode: 'hands' as const, seat: true }

/** clone with per-key patches (top, bottom) */
const tweak = (base: Timeline, top: Patch, bottom: Patch): Timeline => ({
  ...base,
  keys: [
    { ...base.keys[0], p: { ...base.keys[0].p, ...top } },
    { ...base.keys[1], p: { ...base.keys[1].p, ...bottom } },
  ],
})

/* ================================================================
   THE FIVE GREAT COMPOUNDS — reviewed first; tune freely.
   ================================================================ */

export const COMPOUND_KEYFRAMES: Record<string, Timeline> = {
  /* back squat — bar rides the upper back; hips travel down-and-
     back, knees track forward, torso inclines ~26°, near-vertical
     bar line */
  Squat: rep(
    { staging: 'standing', barMode: 'back' },
    { shin: 3, thigh: 0, torso: 7, bend: -1 },
    { shin: 40, thigh: -55, torso: 26, bend: -1 },
    { up: 1.15, down: 1.3 }
  ),

  /* bench press — bar touches mid-chest, presses up-and-slightly-
     back over the shoulder; elbow sinks below the bench at the
     bottom and extends at lockout */
  'Bench Press': rep(
    bench,
    { bar: [66, 60], bend: -1 },
    { bar: [74, 92], bend: -1 },
    { up: 1.05, down: 1.2 }
  ),

  /* deadlift — pure hip hinge, flat back; the bar hangs from long
     arms and tracks a vertical line up the legs to a tall lockout */
  Deadlift: rep(
    standing,
    { shin: 0, thigh: 0, torso: 4, bar: [78, 96] },
    { shin: 22, thigh: -35, torso: 62, bar: [80, 118] },
    { up: 1.2, down: 1.25, holdTop: 0.55 }
  ),

  /* overhead press — vertical bar line from the collar to lockout,
     slight layback at the top, elbows beneath the bar at the rack */
  'Overhead Press': rep(
    standing,
    { torso: -8, bar: [72, 17], bend: -1 },
    { torso: -3, bar: [78, 53], bend: -1 },
    { up: 1.1, down: 1.0, holdBottom: 0.5 }
  ),

  /* barbell row — torso hinged and HELD; only the bar moves,
     dead hang → torn to the waist, elbows driving up-back */
  'Barbell Row': rep(
    standing,
    { shin: 15, thigh: -28, torso: 55, bar: [86, 87], bend: -1 },
    { shin: 15, thigh: -28, torso: 55, bar: [92, 112], bend: -1 },
    { up: 1.0, down: 0.95 }
  ),
}

/* ================================================================
   THE REST OF THE CODEX
   ================================================================ */

const SQ = COMPOUND_KEYFRAMES.Squat
const BP = COMPOUND_KEYFRAMES['Bench Press']
const DL = COMPOUND_KEYFRAMES.Deadlift
const OHP = COMPOUND_KEYFRAMES['Overhead Press']
const ROW = COMPOUND_KEYFRAMES['Barbell Row']

/* prone base (push-up / plank): feet planted far right, the chain
   leans to near-horizontal, hands rooted on the floor */
const PRONE_TOP: Patch = { ankleX: 112, shin: -62, thigh: -78, torso: -80, bar: [34, 138], bend: -1 }

const RITES: Record<string, Timeline> = {
  ...COMPOUND_KEYFRAMES,

  /* ---------- chest ---------- */
  /* incline: the line tilts toward the head */
  'Incline Bench Press': tweak(BP, { bar: [60, 58] }, { bar: [72, 90] }),
  /* dumbbells: a deeper stretch at the bottom */
  'Dumbbell Bench Press': tweak(BP, {}, { bar: [76, 96] }),
  /* seated machine press: handles travel forward from mid-chest */
  'Machine Chest Press': rep(
    seated,
    { hip: [58, 106], thigh: 78, shin: 8, torso: -6, bar: [102, 74], bend: -1 },
    { hip: [58, 106], thigh: 78, shin: 8, torso: -6, bar: [74, 78], bend: -1 }
  ),
  /* fly: soft elbows sweep a wide arc to an embrace */
  'Cable Fly': rep(
    standing,
    { torso: 4, bar: [104, 66], bend: -1 },
    { torso: 4, bar: [112, 92], bend: -1 }
  ),
  /* push-up: the slab pivots about the toes; hands stay rooted */
  'Push-Up': rep(
    { staging: 'standing', barMode: 'hands' },
    PRONE_TOP,
    { ...PRONE_TOP, shin: -68, thigh: -84, torso: -86 },
    { up: 0.95, down: 1.05 }
  ),
  /* dip: hands fixed on the bars; the body sinks between them */
  Dip: rep(
    { staging: 'anchored', barMode: 'hands', overheadBar: [88, 64] },
    { hip: [72, 92], thigh: 20, shin: -75, torso: 12, bar: [88, 64], bend: -1 },
    { hip: [76, 104], thigh: 24, shin: -78, torso: 20, bar: [88, 64], bend: -1 }
  ),

  /* ---------- back ---------- */
  /* rack pull: the short heavy road — pins at the knees */
  'Rack Pull': tweak(DL, {}, { shin: 12, thigh: -20, torso: 44, bar: [80, 108] }),
  'T-Bar Row': tweak(ROW, { torso: 60, bar: [88, 90] }, { torso: 60, bar: [93, 113] }),
  'Seated Cable Row': rep(
    seated,
    { hip: [58, 108], thigh: 80, shin: 14, torso: -4, bar: [80, 96], bend: -1 },
    { hip: [58, 108], thigh: 80, shin: 14, torso: 10, bar: [98, 94], bend: -1 }
  ),
  'Machine Row': rep(
    seated,
    { hip: [58, 108], thigh: 80, shin: 14, torso: 2, bar: [82, 92], bend: -1 },
    { hip: [58, 108], thigh: 80, shin: 14, torso: 2, bar: [100, 90], bend: -1 }
  ),
  /* pull-up: hands never leave the bar; the body rises to it */
  'Pull-Up': rep(
    { staging: 'anchored', barMode: 'hands', overheadBar: [76, 20] },
    { hip: [72, 68], thigh: 10, shin: -30, torso: 4, bar: [76, 20] },
    { hip: [74, 92], thigh: 5, shin: -14, torso: 2, bar: [76, 20] },
    { up: 1.15, down: 1.0, holdTop: 0.5 }
  ),
  'Lat Pulldown': rep(
    seated,
    { hip: [66, 108], thigh: 55, shin: -35, torso: -6, bar: [82, 24], bend: -1 },
    { hip: [66, 108], thigh: 55, shin: -35, torso: -12, bar: [80, 62], bend: -1 }
  ),

  /* ---------- legs ---------- */
  /* front squat: the torso stays upright, bar racked at the collar */
  'Front Squat': rep(
    standing,
    { shin: 3, thigh: 0, torso: 2, bar: [82, 58], bend: -1 },
    { shin: 42, thigh: -58, torso: 10, bar: [84, 84], bend: -1 },
    { up: 1.15, down: 1.3 }
  ),
  'Goblet Squat': rep(
    standing,
    { shin: 3, thigh: 0, torso: 4, bar: [84, 66], bend: -1 },
    { shin: 40, thigh: -55, torso: 16, bar: [86, 90], bend: -1 },
    { up: 1.15, down: 1.3 }
  ),
  'Bulgarian Split Squat': tweak(SQ, { torso: 4 }, { shin: 44, thigh: -62, torso: 18 }),
  'Walking Lunge': tweak(SQ, { torso: 3 }, { shin: 46, thigh: -60, torso: 12 }),
  'Hack Squat': tweak(SQ, { torso: -2 }, { shin: 44, thigh: -60, torso: 6 }),
  'Romanian Deadlift': tweak(DL, { bar: [78, 96] }, { shin: 5, thigh: -14, torso: 74, bar: [79, 112] }),
  /* the leg machines: the ember rides the working foot */
  'Leg Press': rep(
    { staging: 'anchored', barMode: 'foot', seat: true },
    { hip: [56, 104], thigh: 52, shin: 38, torso: -32, bar: [58, 112], bend: 1 },
    { hip: [56, 104], thigh: 12, shin: 82, torso: -32, bar: [58, 112], bend: 1 }
  ),
  'Leg Extension': rep(
    { staging: 'anchored', barMode: 'foot', seat: true },
    { hip: [60, 106], thigh: 82, shin: 82, torso: -8, bar: [64, 112], bend: 1 },
    { hip: [60, 106], thigh: 82, shin: 6, torso: -8, bar: [64, 112], bend: 1 },
    { holdTop: 0.55 } // pause locked at the summit
  ),
  /* lying curl, sketched hip-anchored: the heel arcs to the seat */
  'Leg Curl': rep(
    { staging: 'anchored', barMode: 'foot', seat: true },
    { hip: [60, 112], thigh: 88, shin: 168, torso: -78, bar: [50, 120], bend: 1 },
    { hip: [60, 112], thigh: 88, shin: 96, torso: -78, bar: [50, 120], bend: 1 }
  ),
  /* hip thrust: shoulders stay high; the pelvis is the mover */
  'Hip Thrust': rep(
    { staging: 'anchored', barMode: 'hands', seat: true },
    { hip: [74, 100], thigh: 62, shin: 14, torso: -76, bar: [76, 100], bend: 1 },
    { hip: [74, 116], thigh: 80, shin: 26, torso: -58, bar: [76, 116], bend: 1 },
    { holdTop: 0.55 } // tribute paid in full at the top
  ),
  /* calf raise: legs stay straight; the whole vessel rises */
  'Calf Raise': rep(
    { staging: 'anchored', barMode: 'hands' },
    { hip: [74, 81], thigh: 0, shin: 0, torso: 0, bar: [78, 90] },
    { hip: [74, 88], thigh: 0, shin: 0, torso: 0, bar: [78, 97] },
    { up: 0.75, down: 0.75, holdTop: 0.55 }
  ),

  /* ---------- shoulders ---------- */
  'Arnold Press': tweak(OHP, { bar: [72, 18] }, { bar: [76, 56] }),
  'Machine Shoulder Press': tweak(OHP, { torso: -4, bar: [74, 20] }, { torso: -2, bar: [78, 52] }),
  /* straight-ish arm sweeps to the horizon — no higher */
  'Lateral Raise': rep(
    standing,
    { torso: -2, bar: [106, 58], bend: -1 },
    { torso: -2, bar: [80, 94], bend: -1 },
    { up: 1.0, down: 1.1 } // lower slower than thou rose
  ),
  'Rear Delt Fly': rep(
    standing,
    { shin: 12, thigh: -24, torso: 52, bar: [112, 72], bend: -1 },
    { shin: 12, thigh: -24, torso: 52, bar: [92, 108], bend: -1 }
  ),
  'Face Pull': rep(
    standing,
    { torso: -4, bar: [86, 52], bend: -1 },
    { torso: -2, bar: [114, 60], bend: -1 }
  ),

  /* ---------- arms ---------- */
  /* curls: the elbow stays pinned; only the forearm arcs */
  'Barbell Curl': rep(
    standing,
    { torso: -4, bar: [88, 62], bend: -1 }, // bend -1 keeps the elbow pinned low
    { torso: -2, bar: [78, 95], bend: -1 },
    { up: 0.95, down: 1.05 }
  ),
  'Dumbbell Curl': rep(
    standing,
    { torso: -4, bar: [88, 62], bend: -1 },
    { torso: -2, bar: [78, 95], bend: -1 },
    { up: 0.95, down: 1.05 }
  ),
  'Hammer Curl': rep(
    standing,
    { torso: -4, bar: [86, 58], bend: -1 },
    { torso: -2, bar: [78, 95], bend: -1 },
    { up: 0.9, down: 1.0 }
  ),
  'Preacher Curl': rep(
    standing,
    { torso: 14, bar: [92, 66], bend: -1 },
    { torso: 14, bar: [90, 90], bend: -1 },
    { up: 0.95, down: 1.05 }
  ),
  'Tricep Pushdown': rep(
    standing,
    { torso: 4, bar: [82, 96], bend: -1 },
    { torso: 4, bar: [88, 70], bend: -1 },
    { up: 0.9, down: 0.85, holdTop: 0.5 }
  ),
  'Skull Crusher': rep(
    bench,
    { bar: [64, 60], bend: 1 },
    { bar: [50, 82], bend: 1 } // toward the brow, with reverence
  ),
  'Overhead Tricep Extension': rep(
    standing,
    { torso: -4, bar: [70, 18], bend: 1 },
    { torso: -4, bar: [56, 38], bend: 1 } // behind the skull, deep stretch
  ),
  'Close-Grip Bench Press': tweak(BP, { bar: [68, 62] }, { bar: [76, 94] }),

  /* ---------- core ---------- */
  Plank: rep(
    { staging: 'standing', barMode: 'hands' },
    PRONE_TOP,
    { ...PRONE_TOP, thigh: -80, torso: -82 }, // hips breathe a hair's breadth
    { up: 1.6, down: 1.6, holdTop: 0.25, holdBottom: 0.25 }
  ),
  'Hanging Leg Raise': rep(
    { staging: 'anchored', barMode: 'hands', overheadBar: [74, 20] },
    { hip: [74, 90], thigh: 82, shin: 8, torso: 0, bar: [74, 20] }, // legs raised to the horizon
    { hip: [74, 90], thigh: 6, shin: -4, torso: 2, bar: [74, 20] }, // the dead hang
    { up: 1.15, down: 1.05 }
  ),
  /* kneeling before the tower; only the spine bows */
  'Cable Crunch': rep(
    { staging: 'anchored', barMode: 'hands' },
    { hip: [68, 114], thigh: 22, shin: -92, torso: 24, bar: [88, 78], bend: -1 },
    { hip: [68, 114], thigh: 22, shin: -92, torso: 58, bar: [98, 96], bend: -1 },
    { up: 0.95, down: 0.9 }
  ),
  'Russian Twist': rep(
    { staging: 'anchored', barMode: 'hands' },
    { hip: [70, 112], thigh: 68, shin: 30, torso: -26, bar: [96, 82] },
    { hip: [70, 112], thigh: 68, shin: 30, torso: -30, bar: [66, 88] },
    { up: 0.8, down: 0.8, holdTop: 0.3, holdBottom: 0.3 }
  ),
  /* the pilgrim's march: iron at the side, tall and steady */
  "Farmer's Carry": rep(
    standing,
    { torso: -2, bar: [80, 97] },
    { shin: 3, thigh: -4, torso: 1, bar: [81, 101] },
    { up: 0.8, down: 0.8, holdTop: 0.15, holdBottom: 0.15 }
  ),
}

/* the quiet fallback for names not in the codex catalog */
const EMBER: Timeline = rep(
  standing,
  { torso: 2, bar: [78, 96] },
  { shin: 3, thigh: -4, torso: 5, bar: [79, 100] },
  { up: 1.7, down: 1.7, holdTop: 0.25, holdBottom: 0.25 }
)

export const timelineFor = (name: string): Timeline => RITES[name] ?? EMBER

/** exposed for the coverage unit test */
export const AUTHORED_RITES = Object.keys(RITES)
