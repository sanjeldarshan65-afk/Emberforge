import type { Battle, Movement, Vitals } from '../state/store'

/* ================================================================
   THE FIRE KEEPER — analysis oracle
   ----------------------------------------------------------------
   `seekGuidance(ctx)` is the single entry point the UI calls.
   It is async and takes a plain-data context, so swapping the
   local generator for a real LLM is a one-function change.

   >>> TO HOOK UP LM STUDIO LATER, replace the body of
   >>> `seekGuidance` with:
   >>>
   >>>   const res = await fetch('http://localhost:1234/v1/chat/completions', {
   >>>     method: 'POST',
   >>>     headers: { 'Content-Type': 'application/json' },
   >>>     body: JSON.stringify({
   >>>       model: 'local-model',            // whatever LM Studio serves
   >>>       temperature: 0.8,
   >>>       messages: [
   >>>         { role: 'system', content: KEEPER_PERSONA },
   >>>         { role: 'user', content: buildPrompt(ctx) },
   >>>       ],
   >>>     }),
   >>>   })
   >>>   const data = await res.json()
   >>>   return data.choices[0].message.content as string
   ================================================================ */

export type KeeperContext = {
  battles: Battle[]
  prs: Record<Movement, number>
  vitals: Vitals
  taperRatio: number
  taperGoal: number
}

/** system prompt for the eventual local model — already written for you */
export const KEEPER_PERSONA = `You are the Fire Keeper of Emberforge, a somber and caring guide in the style of a FromSoftware sanctuary NPC. You speak in archaic, poetic English (thee, thou, thy). You are also a genuinely knowledgeable strength coach. Given the user's lift records, recent workouts, and physique ratios, identify their weakest lift relative to bodyweight standards and give specific, practical programming advice (sets, reps, accessories, progression) woven into your lore-heavy speech. Keep replies under 180 words.`

/** serializes store state into the user prompt the LLM will receive */
export function buildPrompt(ctx: KeeperContext): string {
  const battleLines = ctx.battles
    .slice(0, 5)
    .map(
      (b) =>
        `- ${b.movement}: top set ${b.topWeight} lb x ${b.topReps} (est 1RM ${b.e1rm}), ${b.sets.length} sets, ${b.volume} lb volume, ${b.date.slice(0, 10)}`
    )
    .join('\n')
  const prLines = (Object.entries(ctx.prs) as [Movement, number][])
    .map(([m, w]) => `- ${m}: ${w > 0 ? `${w} lb` : 'no record'}`)
    .join('\n')
  return [
    `Bodyweight: ${ctx.vitals.bodyweight} lb, body fat ${ctx.vitals.bodyFat}%.`,
    `Shoulder-to-waist ratio: ${ctx.taperRatio.toFixed(3)} (goal ${ctx.taperGoal}).`,
    `Personal records:\n${prLines}`,
    `Recent battles:\n${battleLines || '- none yet'}`,
    `Identify my weakest lift and advise me.`,
  ].join('\n\n')
}

/* ----------------------------------------------------------------
   local generator (placeholder until the model is hooked up)
   ---------------------------------------------------------------- */

/** strength standards: intermediate PR target as a multiple of bodyweight */
const STANDARDS: Record<Movement, number> = {
  Squat: 1.5,
  'Bench Press': 1.0,
  Deadlift: 1.75,
  'Overhead Press': 0.66,
  'Barbell Row': 0.9,
}

const CRITIQUE: Record<Movement, { flaw: string; counsel: string }> = {
  Squat: {
    flaw: 'Thy legs are as saplings beneath an old crown — the squat lags behind all else thou hast forged.',
    counsel:
      'Descend slowly, three breaths down, and pause in the depths before rising. Squat twice each week: once heavy for five, once lighter for eight. Let front squats and split squats be thy accessories, and add five pounds each week without fail.',
  },
  'Bench Press': {
    flaw: 'Thy pressing arm falters — the bench is the weakest ember upon thy anvil.',
    counsel:
      'Draw thy shoulder blades together as a drawn bow, and let the bar touch low upon the chest. Press twice weekly: fives at heavy weight, then eights with a closer grip. Dips and overhead work shall harden the mortar between the stones.',
  },
  Deadlift: {
    flaw: 'The earth resists thee — thy deadlift is unworthy of the frame that carries it.',
    counsel:
      'Wedge thyself against the bar before it leaves the ground; the pull begins in silence, not in haste. One heavy day each week: three to five hard singles or triples. Romanian deadlifts and rows shall forge the chain of thy back.',
  },
  'Overhead Press': {
    flaw: 'Thy press toward the heavens is faint — the overhead lift trails all thy other works.',
    counsel:
      'Brace thy trunk as a keep withstands siege, squeeze the bar, and drive thy skull through the window once it passes. Press first when fresh, fives and eights, and let lateral raises and close-grip pressing feed the flame.',
  },
  'Barbell Row': {
    flaw: 'Thy back is a neglected rampart — the row crumbles where the rest stands firm.',
    counsel:
      'Pull the bar to thy waist as though tearing a blade from the earth, without heave of the hips. Row thrice weekly in modest loads — eights and tens — and chin-ups besides. A wide back is the foundation of the golden taper thou seekest.',
  },
}

const GENERIC_CRITIQUE = {
  flaw: 'This lift trails all thy other works — the embers speak plainly.',
  counsel:
    'Grant it the first slot of thy sessions, while strength is fresh. Two hard sets more each week, and add the smallest plate thou possessest whenever all reps are conquered.',
}

function generateLocally(ctx: KeeperContext): string {
  const { prs, vitals, battles, taperRatio, taperGoal } = ctx

  /* no deeds yet — the keeper cannot read cold ashes */
  if (battles.length === 0) {
    return 'Ashen one... the embers hold no memory of thee. Thou hast fought no battles I can read. Go — clash with the iron in the Combat Log, and return when thy deeds have left ash for me to sift. Only then may I speak of what is weak, and what may yet be made strong.'
  }

  /* weakest lift = lowest PR relative to bodyweight standard */
  const judged = (Object.entries(prs) as [Movement, number][])
    .filter(([m, w]) => w > 0 && STANDARDS[m] !== undefined)
    .map(([m, w]) => ({
      movement: m,
      pr: w,
      score: w / (vitals.bodyweight * STANDARDS[m]),
      target: Math.round(vitals.bodyweight * STANDARDS[m]),
    }))
    .sort((a, b) => a.score - b.score)

  if (judged.length === 0) {
    return 'Thou hast fought, yet claimed no records... curious. Complete thy battles fully, that the iron may remember thy name. When records stand, I shall name the weakest among them and counsel thee on its mending.'
  }

  const weak = judged[0]
  const c = CRITIQUE[weak.movement] ?? GENERIC_CRITIQUE
  const pctOfStandard = Math.round(weak.score * 100)

  /* taper reading */
  const taperPct = Math.min((taperRatio / taperGoal) * 100, 100).toFixed(0)
  const taperLine =
    Number(taperPct) >= 95
      ? `And thy silhouette... the golden taper is nearly thine, ${taperPct} parts of a hundred. The ratio of legend bends toward thee.`
      : `Thy taper stands at ${taperRatio.toFixed(3)} against the fabled ${taperGoal} — ${taperPct} parts of a hundred walked. Widen the shoulders, guard the waist, and the V shall come.`

  return [
    `Welcome home, ashen one. I have sifted the ashes of thy ${battles.length} most recent battle${battles.length > 1 ? 's' : ''}, and the embers do not lie.`,
    `${c.flaw} Thy record stands at ${weak.pr} lb — but a body of ${vitals.bodyweight} lb ought command ${weak.target} lb. Thou hast walked only ${pctOfStandard} parts in a hundred of that road.`,
    c.counsel,
    taperLine,
    'Go now. The flame watches thy progress, and so do I.',
  ].join('\n\n')
}

/** simulated contemplation, so the UI's loading state is honest */
const ponder = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/* ================================================================
   THE ENTRY POINT — swap this body for the LM Studio fetch above
   ================================================================ */
export async function seekGuidance(ctx: KeeperContext): Promise<string> {
  await ponder(900 + Math.random() * 700)
  return generateLocally(ctx)
}
