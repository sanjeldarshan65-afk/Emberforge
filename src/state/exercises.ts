/* ================================================================
   THE CATALOG OF RITES — single source of truth for every exercise
   Powers: Combat Log picker, PRs, Grimoire plans, the Codex,
   the muscle heatmap, and the Fire Keeper's judgments.
   ================================================================ */

export const MUSCLE_GROUPS = ['Shoulders', 'Chest', 'Back', 'Core', 'Legs'] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export type Category = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core'

export type Exercise = {
  name: string
  category: Category
  compound: boolean
  primary: string[]   // display muscles
  secondary: string[]
  heat: { primary: MuscleGroup[]; secondary: MuscleGroup[] } // avatar heatmap
  standard?: number   // intermediate PR target, x bodyweight (Fire Keeper)
  cues: [string, string, string]
}

export const EXERCISES: Exercise[] = [
  /* ---------- chest ---------- */
  { name: 'Bench Press', category: 'Chest', compound: true, standard: 1.0,
    primary: ['Chest'], secondary: ['Front Delts', 'Triceps'],
    heat: { primary: ['Chest'], secondary: ['Shoulders'] },
    cues: ['Draw thy shoulder blades together, as a bow before the loose.', 'Lower the bar to the low chest — slow, silent, in control.', 'Drive thy feet into the earth; the whole body presses, not the arms alone.'] },
  { name: 'Incline Bench Press', category: 'Chest', compound: true,
    primary: ['Upper Chest'], secondary: ['Front Delts', 'Triceps'],
    heat: { primary: ['Chest'], secondary: ['Shoulders'] },
    cues: ['Set the bench as a rampart, thirty degrees toward heaven.', 'Bring the bar to the collar of thy armor, elbows tucked.', 'Press up and slightly back, toward the crown thou seekest.'] },
  { name: 'Push-Up', category: 'Chest', compound: false,
    primary: ['Chest'], secondary: ['Core', 'Triceps'],
    heat: { primary: ['Chest'], secondary: ['Core'] },
    cues: ['Brace the core like iron; the body moves as a single slab of stone.', 'Descend until thy chest grazes the ground.', 'Drive the earth away from thee.'] },
  { name: 'Dip', category: 'Chest', compound: false,
    primary: ['Lower Chest'], secondary: ['Triceps', 'Front Delts'],
    heat: { primary: ['Chest'], secondary: ['Shoulders'] },
    cues: ['Lean forward as one peering into the abyss.', 'Descend until the shoulders sink just below the elbows — no further.', 'Press back to the summit without swinging; the iron respects stillness.'] },

  /* ---------- back ---------- */
  { name: 'Deadlift', category: 'Back', compound: true, standard: 1.75,
    primary: ['Posterior Chain'], secondary: ['Lats', 'Core', 'Grip'],
    heat: { primary: ['Back'], secondary: ['Legs', 'Core'] },
    cues: ['Wedge thyself against the bar; take the slack as a held breath.', 'The bar climbs thy legs like ivy up a keep.', 'Stand tall at the summit. Do not lean back into ruin.'] },
  { name: 'Barbell Row', category: 'Back', compound: true, standard: 0.9,
    primary: ['Lats', 'Mid Back'], secondary: ['Biceps', 'Core'],
    heat: { primary: ['Back'], secondary: ['Shoulders'] },
    cues: ['Hinge and hold — the torso is a drawbridge, lowered and locked.', 'Tear the bar to thy waist as a blade from the earth.', 'Let no heave of the hips steal what the back must earn.'] },
  { name: 'Pull-Up', category: 'Back', compound: false,
    primary: ['Lats'], secondary: ['Biceps', 'Rear Delts'],
    heat: { primary: ['Back'], secondary: [] },
    cues: ['Hang as the condemned; rise as the chosen.', 'Pull thine elbows to thy ribs, not thy chin to the bar.', 'Descend with control — the fall teaches as much as the rise.'] },
  { name: 'Lat Pulldown', category: 'Back', compound: false,
    primary: ['Lats'], secondary: ['Biceps'],
    heat: { primary: ['Back'], secondary: [] },
    cues: ['Sit tall; anchor thy thighs beneath the pads as roots beneath stone.', 'Draw the bar to thy collarbone, chest rising to meet it.', 'Resist the return — the cable is a serpent that must not escape.'] },

  /* ---------- legs ---------- */
  { name: 'Squat', category: 'Legs', compound: true, standard: 1.5,
    primary: ['Quads', 'Glutes'], secondary: ['Core'],
    heat: { primary: ['Legs'], secondary: ['Core'] },
    cues: ['Root thy feet; grip the ground as talons grip prey.', 'Sit between thy legs — three breaths down, chest proud.', 'Rise as though the sky itself resists thee.'] },
  { name: 'Front Squat', category: 'Legs', compound: true,
    primary: ['Quads'], secondary: ['Core', 'Upper Back'],
    heat: { primary: ['Legs'], secondary: ['Core'] },
    cues: ['Rack the bar upon thy collar as a yoke of office; elbows to the sky.', 'Stay upright — to bow forward is to drop the crown.', 'Descend deep, and rise leading with the elbows.'] },
  { name: 'Bulgarian Split Squat', category: 'Legs', compound: false,
    primary: ['Quads', 'Glutes'], secondary: ['Core'],
    heat: { primary: ['Legs'], secondary: ['Core'] },
    cues: ['One foot enthroned behind thee; the front leg bears the covenant alone.', 'Descend straight as a plumb line, knee tracking o’er the toes.', 'Endure. This one is meant to hurt.'] },
  { name: 'Romanian Deadlift', category: 'Legs', compound: false,
    primary: ['Hamstrings', 'Glutes'], secondary: ['Lower Back'],
    heat: { primary: ['Legs'], secondary: ['Back'] },
    cues: ['Push thy hips back as if closing a great door behind thee.', 'The bar never strays from thy legs — keep the blade sheathed close.', 'Descend only while the hamstrings sing; rise before they scream.'] },
  { name: 'Hip Thrust', category: 'Legs', compound: false,
    primary: ['Glutes'], secondary: ['Hamstrings', 'Core'],
    heat: { primary: ['Legs'], secondary: ['Core'] },
    cues: ['Shoulders upon the bench, crown of a fallen throne.', 'Drive through the heels until thy hips lock at the summit.', 'Hold one breath at the top — tribute must be paid in full.'] },
  { name: 'Leg Press', category: 'Legs', compound: false,
    primary: ['Quads', 'Glutes'], secondary: ['Hamstrings'],
    heat: { primary: ['Legs'], secondary: [] },
    cues: ['Set thy feet upon the sled as upon a castle gate to be forced.', 'Lower until the knees near thy chest, spine pinned to the seat.', 'Never let the knees lock in arrogance at the top.'] },

  /* ---------- shoulders ---------- */
  { name: 'Overhead Press', category: 'Shoulders', compound: true, standard: 0.66,
    primary: ['Delts'], secondary: ['Triceps', 'Core'],
    heat: { primary: ['Shoulders'], secondary: ['Core'] },
    cues: ['Brace thy trunk as a keep withstands siege.', 'Squeeze the bar to wake the arms, and press without leaning.', 'Once past thy crown, drive the skull through the window.'] },
  { name: 'Lateral Raise', category: 'Shoulders', compound: false,
    primary: ['Side Delts'], secondary: [],
    heat: { primary: ['Shoulders'], secondary: [] },
    cues: ['Raise the iron as wings unfurling, elbows soft.', 'Halt at the horizon — no higher.', 'Lower slower than thou rose. The descent is the sermon.'] },
  { name: 'Face Pull', category: 'Shoulders', compound: false,
    primary: ['Rear Delts'], secondary: ['Upper Back'],
    heat: { primary: ['Shoulders'], secondary: ['Back'] },
    cues: ['Draw the rope to thy brow, elbows high as raised shields.', 'Pull the hands apart at the end, as if tearing a scroll.', 'Light iron, high count — this is a rite of maintenance, not glory.'] },

  /* ---------- arms ---------- */
  { name: 'Barbell Curl', category: 'Arms', compound: false,
    primary: ['Biceps'], secondary: ['Forearms'],
    heat: { primary: [], secondary: [] },
    cues: ['Pin thine elbows to thy flanks; they are anchors, not hinges of the swing.', 'Curl the iron in a proud arc, wrists unbending.', 'Lower through three slow counts. Cheated reps feed no fire.'] },

  /* ---------- core ---------- */
  { name: 'Plank', category: 'Core', compound: false,
    primary: ['Core'], secondary: ['Shoulders', 'Glutes'],
    heat: { primary: ['Core'], secondary: ['Shoulders'] },
    cues: ['Become the drawbridge — rigid from crown to heel.', 'Squeeze the glutes and brace as if awaiting a blow.', 'Breathe shallow and steady; the trembling is the offering.'] },
  { name: "Farmer's Carry", category: 'Core', compound: false,
    primary: ['Core', 'Grip'], secondary: ['Traps', 'Upper Back'],
    heat: { primary: ['Core'], secondary: ['Back'] },
    cues: ['Take up the burdens as a pilgrim takes up penance.', 'Walk tall — shoulders back, ribs stacked over hips.', 'Set the iron down with dignity, not surrender.'] },
]

const BY_NAME = new Map(EXERCISES.map((e) => [e.name, e]))

export const getExercise = (name: string) => BY_NAME.get(name)

export const CATEGORIES: Category[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
