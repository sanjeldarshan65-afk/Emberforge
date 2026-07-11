import type { Exercise } from './exercises'

/* ================================================================
   THE DEEP CODEX — lore-grade detail for every rite: the common
   faults the Fire Keeper has watched hollows repeat for an age,
   the implement the rite demands, and the rank it asks of thee.

   Derived by movement pattern and name, so every rite in the
   catalog (and any added later) is covered without hand-scribing
   each page. Pure and dependency-free; tested in tests/codex.test.ts.
   ================================================================ */

export type Equipment = 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight'
export type Tier = 'Novice' | 'Adept' | 'Master'
export type RiteDetails = { equipment: Equipment; tier: Tier; faults: string[] }

/* ---------- the faults, by movement pattern ---------- */
const FAULTS: [RegExp, string[]][] = [
  [
    /squat|leg press|hack|lunge/i,
    [
      'Thy knees bow inward like failing arches — drive them out over thy feet, and the vault shall hold.',
      'Thou risest hips-first, folded like a drawbridge — rise as one piece, chest and hips together.',
      'Half-measures win no wars. Descend until the hips break parallel, or the rite counts for little.',
    ],
  ],
  [
    /deadlift|rack pull|good morning/i,
    [
      'Thy spine rounds like a beaten cur — set thy back proud before the bar leaves the earth.',
      'The bar drifts from thee as a faithless ally. Keep it dragging against thy legs, root to lockout.',
      'Thou snatchest at the bar. Pull the slack from it in silence first; the earth yields to patience, not haste.',
    ],
  ],
  [
    /leg extension|leg curl/i,
    [
      'Thou kickest the stack as though spurring a horse — move slow, and let the muscle alone carry the iron.',
      'The pad crashes home between reps. Stop short of the stack’s rest; keep the flame lit the whole set.',
    ],
  ],
  [
    /barbell row|cable row|t-bar|machine row|face pull|rear delt/i,
    [
      'Thou heavest with thy hips, not thy back — let the torso stay still as a rampart; only the arms and blades move.',
      'Thy shoulders shrug toward thine ears. Pull the blades down and together, as though sheathing wings.',
      'The pull dies at half-road. Draw the iron to thy body and let it touch, or the back learns nothing.',
    ],
  ],
  [
    /bench|chest press|push-up|dip\b|fly/i,
    [
      'Thy elbows flare to the crucifix — tuck them toward thy ribs, lest thy shoulders pay the toll.',
      'The bar bounces from thy chest as off a shield. Touch soft, pause a breath, then drive.',
      'Thy feet wander like unwatched squires. Plant them, and press with the whole of thy body.',
    ],
  ],
  [
    /overhead press|arnold|shoulder press/i,
    [
      'Thou leanest back as though limbo were the rite — brace thy trunk upright; the arch is a false door.',
      'The bar sails around thy chin instead of through it. Tuck the chin, press close, drive thy skull through the window.',
      'Thy ribs flare skyward and the press dies. Exhale hard, lock the cage down, then begin.',
    ],
  ],
  [
    /pull-up|chin-up|pulldown/i,
    [
      'Thou swingest like a bell in a storm — hang quiet, then pull; the kip is borrowed strength and the debt comes due.',
      'Thy arms labor alone while the back sleeps. Begin each rep by drawing the shoulder blades down.',
      'The rite ends at half-mast. Chin over the bar above, arms long below — the full road, every rep.',
    ],
  ],
  [
    /curl/i,
    [
      'Thy hips swing the iron that thine arms should carry. Pin the elbows to thy ribs and let them hinge alone.',
      'Thy wrists curl inward like burning parchment — hold them straight; the forearm is a beam, not a hinge.',
      'Thou droppest the iron as though it burned. Lower in three slow breaths; the descent forges more than the rise.',
    ],
  ],
  [
    /pushdown|skull crusher|tricep|extension/i,
    [
      'Thy elbows wander from thy sides like deserters — nail them in place; only the forearm travels.',
      'Thy shoulders creep into labor not theirs. Keep them quiet, and let the triceps bear the whole toll.',
      'Thou cuttest the road short. Full lockout at the bottom, full stretch at the top — anything less is a half-oath.',
    ],
  ],
  [
    /plank|crunch|leg raise|twist/i,
    [
      'Thy hips sag like a rotten beam — squeeze the glutes and draw the navel to the spine; the body is one slab.',
      'Thou holdest thy breath as a miser holds coin. Breathe steady; the brace must live through the breath.',
      'Thou yankest at thy neck for counsel it cannot give. The eyes stay down; the trunk does the work.',
    ],
  ],
  [
    /hip thrust/i,
    [
      'Thou archest thy back to steal the last inches — the spine stays neutral; the hips alone rise.',
      'The lockout is left unfinished, a gate half-shut. Drive until the hips are proud and squeeze a full breath.',
      'Thy feet stand too far afield. Set them so the shins stand upright at the summit.',
    ],
  ],
  [
    /calf/i,
    [
      'Thou bouncest from the stretch like a startled hare — pause in the depths, and let the tendon surrender its theft.',
      'The rise stops at half-height. Climb to thy toes’ very summit and hold a breath there.',
    ],
  ],
  [
    /lateral raise/i,
    [
      'Thou swingest the iron skyward with thy whole body — lighter bells, slower road, and the shoulder alone lifts.',
      'Thy traps seize the labor. Lead with the elbows, as though pouring from two flagons.',
    ],
  ],
]

const GENERIC_FAULTS = [
  'Thou movest in haste, and haste teaches nothing. Slow the descent; own every inch of the road.',
  'The range is cut short where the growth lives. Take the full stretch and the full squeeze, every rep.',
]

/* ---------- the implement ---------- */
const EQUIPMENT: [RegExp, Equipment][] = [
  [/machine|leg press|hack squat|leg extension|leg curl/i, 'Machine'],
  [/cable|pulldown|pushdown|face pull/i, 'Cable'],
  [/dumbbell|goblet|arnold|hammer|lateral raise|rear delt|split squat|lunge|overhead tricep/i, 'Dumbbell'],
  [/push-up|pull-up|chin-up|dip\b|plank|hanging|russian|crunch|calf raise/i, 'Bodyweight'],
]

/* ---------- the rank the rite demands ---------- */
const MASTER_RITES =
  /^(squat|front squat|deadlift|romanian deadlift|overhead press|bench press|close-grip bench press|barbell row|rack pull)$/i
const NOVICE_RITES = /goblet|push-up|plank|crunch|calf raise|lateral raise|russian twist/i

export function riteDetails(e: Pick<Exercise, 'name'>): RiteDetails {
  const equipment = EQUIPMENT.find(([re]) => re.test(e.name))?.[1] ?? 'Barbell'

  const tier: Tier = MASTER_RITES.test(e.name)
    ? 'Master'
    : NOVICE_RITES.test(e.name) || equipment === 'Machine' || equipment === 'Cable'
      ? 'Novice'
      : 'Adept'

  const faults = FAULTS.find(([re]) => re.test(e.name))?.[1] ?? GENERIC_FAULTS

  return { equipment, tier, faults }
}
