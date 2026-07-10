import type { MuscleGroup } from '../state/recovery'

/* ================================================================
   THE VESSEL'S ANATOMY — shape data for Avatar.tsx.
   viewBox 0 0 200 300, midline x=100. Shapes marked `m: true` are
   authored on the LEFT side and mirrored across the midline at
   render time, so the figure is symmetric by construction.

   Each of the 6 MUSCLE_GROUP regions is drawn as several anatomical
   sub-muscles that share the group's fatigue and light together —
   the data contract (exercises.ts / recovery.ts / balance.ts) is
   untouched.
   ================================================================ */

export type MShape =
  | { t: 'e'; cx: number; cy: number; rx: number; ry: number; m?: boolean }
  | { t: 'r'; x: number; y: number; w: number; h: number; rx: number; m?: boolean }
  | { t: 'p'; d: string; m?: boolean }

/* ---------- body silhouette (shared by fore & aft) ---------- */
export const BODY: MShape[] = [
  /* neck, flaring into the trap slope */
  { t: 'p', d: 'M92 34 C91 42 90 48 86 54 L114 54 C110 48 109 42 108 34 C105 36 95 36 92 34 Z' },
  /* torso — broad shoulders, V-taper, hips */
  {
    t: 'p',
    d: 'M100 54 C90 54 78 58 70 64 C62 69 58 78 59 88 L62 116 C64 138 71 152 79 160 L81 172 C88 177 112 177 119 172 L121 160 C129 152 136 138 138 116 L141 88 C142 78 138 69 130 64 C122 58 110 54 100 54 Z',
  },
  /* arm — deltoid cap to wrist */
  {
    t: 'p',
    d: 'M62 64 C54 68 48 76 47 86 L45 118 C44 136 45 152 49 164 C51 170 57 170 59 164 C62 152 62 136 61 122 L63 96 C64 84 64 72 62 64 Z',
    m: true,
  },
  { t: 'e', cx: 52, cy: 172, rx: 4.5, ry: 6, m: true }, // hand
  /* leg — thigh, knee, calf taper, ankle */
  {
    t: 'p',
    d: 'M81 172 C75 180 72 196 74 218 L77 244 C78 262 80 276 84 286 C86 290 92 290 94 285 C96 274 97 260 97 246 L99 206 L98 178 C93 172 86 168 81 172 Z',
    m: true,
  },
  { t: 'e', cx: 88, cy: 292, rx: 7, ry: 4, m: true }, // foot
]

/* ---------- fore (front) ---------- */
export const FRONT: Record<MuscleGroup, MShape[]> = {
  Shoulders: [
    /* side delt */
    { t: 'p', d: 'M60 62 C53 66 49 74 51 82 C53 88 59 89 63 84 C66 78 65 68 60 62 Z', m: true },
    /* front delt */
    { t: 'p', d: 'M63 62 C60 68 60 76 63 82 C67 87 73 84 74 77 C74 69 70 63 63 62 Z', m: true },
  ],
  Chest: [
    /* upper pec */
    { t: 'p', d: 'M98 74 C88 72 78 76 74 82 C72 86 74 90 78 91 L96 92 C98 88 99 80 98 74 Z', m: true },
    /* lower pec */
    { t: 'p', d: 'M97 94 L79 93 C75 95 74 100 77 105 C82 111 91 113 95 110 C98 107 98 100 97 94 Z', m: true },
  ],
  Core: [
    /* rectus abdominis — three block pairs + tapered lower pair */
    { t: 'r', x: 90, y: 116, w: 9, h: 11, rx: 2, m: true },
    { t: 'r', x: 90, y: 129, w: 9, h: 11, rx: 2, m: true },
    { t: 'r', x: 90, y: 142, w: 9, h: 11, rx: 2, m: true },
    { t: 'p', d: 'M91 156 L99 156 L99 168 C96 172 93 172 91 166 Z', m: true },
    /* obliques */
    { t: 'p', d: 'M87 116 C81 122 78 134 80 146 C82 154 86 158 88 155 L88 118 Z', m: true },
  ],
  Back: [
    /* lats peeking beneath the arms */
    { t: 'p', d: 'M73 98 C67 108 66 124 71 138 C74 132 76 116 75 100 Z', m: true },
  ],
  Legs: [
    /* vastus lateralis (outer quad) */
    { t: 'p', d: 'M77 178 C73 190 72 208 75 222 C78 230 83 229 84 221 L83 184 C81 177 79 175 77 178 Z', m: true },
    /* rectus femoris */
    { t: 'e', cx: 88, cy: 200, rx: 7, ry: 24, m: true },
    /* vastus medialis (teardrop above the knee) */
    { t: 'e', cx: 93, cy: 222, rx: 5, ry: 9, m: true },
    /* tibialis / front of calf */
    { t: 'e', cx: 87, cy: 258, rx: 6, ry: 17, m: true },
  ],
  Arms: [
    /* biceps */
    { t: 'e', cx: 55, cy: 102, rx: 6.5, ry: 14, m: true },
    /* forearm (brachioradialis) */
    { t: 'p', d: 'M50 122 C46 132 45 146 48 158 C50 163 55 162 56 156 C57 144 56 132 55 124 C53 119 51 118 50 122 Z', m: true },
  ],
}

/* ---------- aft (back) ---------- */
export const BACK: Record<MuscleGroup, MShape[]> = {
  Shoulders: [
    /* rear delt */
    { t: 'e', cx: 60, cy: 72, rx: 9, ry: 8, m: true },
  ],
  Chest: [], // not visible from behind
  Back: [
    /* trapezius — the kite */
    { t: 'p', d: 'M100 56 C92 58 84 66 82 76 L98 106 L100 110 L102 106 L118 76 C116 66 108 58 100 56 Z' },
    /* latissimus dorsi */
    { t: 'p', d: 'M81 82 C73 94 71 116 77 136 C82 148 92 154 95 150 L95 110 C90 102 85 92 81 82 Z', m: true },
    /* erector spinae columns */
    { t: 'r', x: 93.5, y: 112, w: 5, h: 46, rx: 2, m: true },
  ],
  Core: [
    /* obliques at the waist */
    { t: 'p', d: 'M82 138 C79 144 78 152 81 160 C84 165 88 164 88 159 L87 140 Z', m: true },
  ],
  Legs: [
    /* glute */
    { t: 'p', d: 'M98 166 C88 163 80 169 79 180 C78 190 85 196 93 195 C98 193 100 187 99 179 Z', m: true },
    /* hamstring */
    { t: 'e', cx: 87, cy: 218, rx: 8, ry: 21, m: true },
    /* gastrocnemius — outer & inner heads */
    { t: 'e', cx: 84, cy: 250, rx: 5.5, ry: 16, m: true },
    { t: 'e', cx: 91, cy: 252, rx: 5, ry: 15, m: true },
  ],
  Arms: [
    /* triceps */
    { t: 'e', cx: 55, cy: 104, rx: 6.5, ry: 15, m: true },
    /* forearm extensors */
    { t: 'e', cx: 52, cy: 142, rx: 5, ry: 16, m: true },
  ],
}
