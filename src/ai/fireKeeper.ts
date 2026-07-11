import type { Battle, Movement, Vitals } from '../state/store'
import { muscleFatigue } from '../state/recovery'
import type { FatigueMap } from '../state/recovery'
import { getExercise } from '../state/exercises'
import { getVisionKey, hasVisionKey } from './vision'
import { readSignals } from '../coach/signals'
import type { CoachSignals, LiftSignal } from '../coach/signals'

/** catalog knowledge, injected into the signals engine */
const LOOKUPS = {
  primaryOf: (m: string) => getExercise(m)?.heat.primary[0],
  standardOf: (m: string) => getExercise(m)?.standard,
}

/** the questions an ashen one may put to the Keeper */
export type KeeperTopic = 'counsel' | 'weakest' | 'stall' | 'cadence' | 'next'

/* ---- the True Mind: opt-in LLM narration over the attuned key ----
   Separate consent from the photo appraiser: enabling this sends the
   Keeper's structured lift summary (numbers only, no name, no dates)
   to the key's provider. Off by default; the deterministic voice is
   the permanent fallback. */
const MIND_STORE = 'emberforge-keeper-mind'
export const keeperMindEnabled = (): boolean => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(MIND_STORE) === '1'
  } catch {
    return false
  }
}
export const setKeeperMind = (on: boolean): void => {
  try {
    localStorage.setItem(MIND_STORE, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

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
  /** widened for the signals engine — optional so older callers stay valid */
  units?: string
  fatigue?: FatigueMap
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
   local narrator — Layer C over coach/signals.ts (Layer A).
   Every number below is computed by the signals engine; this
   function only phrases them. Deterministic, testable, offline.
   ---------------------------------------------------------------- */

const num = (n: number) => Math.round(Math.abs(n))

/** the opening reading of the user's cadence */
function adherenceLine(s: CoachSignals, total: number): string {
  const a = s.adherence
  if (a.drifting && a.daysSinceLast >= 5)
    return `Welcome back, ashen one. ${a.daysSinceLast} days the bonfire sat unattended — I feared thee gone hollow. No shame in the lapse; only in leaving the flame unlit twice. We begin gently.`
  if (a.drifting)
    return `Welcome, ashen one. Thy fire gutters — but ${a.battlesLast14} battle${a.battlesLast14 === 1 ? '' : 's'} this fortnight against thy usual pace. The embers do not judge; they only cool. Let us rekindle the rhythm before we chase new records.`
  if (a.battlesLast14 >= 4)
    return `Welcome home, ashen one. ${a.battlesLast14} battles in the last fortnight — thy cadence holds true, and the ashes of all ${total} deeds lie open before me.`
  return `Welcome home, ashen one. I have sifted the ashes of thy ${total} battle${total === 1 ? '' : 's'}, and the embers do not lie.`
}

/** the trend reading — the lift that moved most, in either direction */
function trendLine(s: CoachSignals, units: string): string | null {
  const movers = s.lifts.filter((l) => l.sessions >= 2)
  if (movers.length === 0) return null
  const biggest = movers.reduce((a, b) => (Math.abs(b.velocity) > Math.abs(a.velocity) ? b : a))
  if (biggest.velocity > 2)
    return `Thy ${biggest.movement} has climbed ${num(biggest.velocity)} ${units} of estimated strength across ${biggest.spanDays} day${biggest.spanDays === 1 ? '' : 's'} — the forge rings true there.`
  if (biggest.velocity < -2)
    return `Thy ${biggest.movement} has slipped ${num(biggest.velocity)} ${units} across ${biggest.spanDays} days. Watch it — strength retreats quietly before it flees.`
  return null
}

/** the focus lift's diagnosis + a concrete next-session prescription */
function focusCounsel(l: LiftSignal, units: string): string {
  switch (l.nextMove.kind) {
    case 'deload':
      return `Now heed me: thy ${l.movement} has not bested itself in ${l.stallLen} battles, and the flesh that drives it still burns (${Math.round(l.fatigue * 100)} parts of a hundred aflame). This is not weakness — it is a fire choked by its own coals. Next session, bank them: ${l.nextMove.toWeight} ${units} for ${l.nextMove.toSets} sets, no more. Strength returns to those who let the embers breathe.`
    case 'hold':
      return `Mark thy ${l.movement}: ${l.stallLen} battles since it last bested itself, held at ${l.lastTopWeight} ${units} — the plateau is real, yet the flesh is cool and willing. Do not flee to lighter iron. Hold the load and sharpen the blade: pause a breath at the hardest point of each rep, keep the reps honest, and the wall shall crack within two battles.`
    case 'advance':
      return `Thy ${l.movement} stands ready at ${l.lastTopWeight} ${units} for ${l.lastTopReps}. The embers are willing — next battle, lay on ${l.nextMove.addWeight} ${units} more, and claim every rep. The smallest plate, added without fail, builds the mightiest legend.`
  }
}

/** one-line prescription per lift — the "next session" reading */
function nextSessionLines(s: CoachSignals, units: string): string {
  const lines = s.lifts.slice(0, 4).map((l) => {
    switch (l.nextMove.kind) {
      case 'advance':
        return `◆ ${l.movement} — lay on ${l.nextMove.addWeight} ${units}: ${l.lastTopWeight + l.nextMove.addWeight} awaits thee.`
      case 'hold':
        return `◆ ${l.movement} — hold ${l.lastTopWeight} ${units}, and pause a breath at the hardest point of every rep.`
      case 'deload':
        return `◆ ${l.movement} — bank the coals: ${l.nextMove.toWeight} ${units} for ${l.nextMove.toSets} sets, no more.`
    }
  })
  return lines.join('\n')
}

function generateLocally(ctx: KeeperContext, topic: KeeperTopic = 'counsel'): string {
  const { prs, vitals, battles, taperRatio, taperGoal } = ctx
  const units = ctx.units ?? 'lb'

  /* no deeds yet — the keeper cannot read cold ashes */
  if (battles.length === 0) {
    return 'Ashen one... the embers hold no memory of thee. Thou hast fought no battles I can read. Go — clash with the iron in the Combat Log, and return when thy deeds have left ash for me to sift. Only then may I speak of what is weak, and what may yet be made strong.'
  }

  const fatigue = ctx.fatigue ?? muscleFatigue(battles)
  const s = readSignals(battles, prs, vitals.bodyweight, fatigue, units, LOOKUPS)

  /* ---- pointed questions get pointed answers ---- */
  if (topic === 'next') {
    return [
      'Thou wouldst know what the iron asks of thee next. Hear it, lift by lift:',
      nextSessionLines(s, units),
      s.deloads.length > 0
        ? 'Where I counsel lighter iron, obey — rest is also training.'
        : 'Claim every rep before thou reachest further. Go.',
    ].join('\n\n')
  }
  if (topic === 'stall') {
    const worst = s.lifts.filter((l) => l.stalled).sort((a, b) => b.stallLen - a.stallLen)[0]
    if (!worst) {
      const trend = trendLine(s, units)
      return [
        'Nothing stalls, ashen one — the forge sings. Every lift I read still climbs or stands too young to judge.',
        trend,
        'Keep thy cadence, and let the smallest plate do its patient work.',
      ]
        .filter(Boolean)
        .join('\n\n')
    }
    return [focusCounsel(worst, units)].join('\n\n')
  }
  if (topic === 'cadence') {
    const a = s.adherence
    return [
      adherenceLine(s, battles.length),
      `The ledger speaks plainly: ${a.battlesLast14} battle${a.battlesLast14 === 1 ? '' : 's'} these fourteen days, ${a.battlesLast42} across six weeks, and ${a.daysSinceLast} day${a.daysSinceLast === 1 ? '' : 's'} since thy last clash with the iron.`,
      a.drifting
        ? 'One battle. That is all I ask of thee this day. The rest shall follow.'
        : 'The flame is tended. Consistency is the truest strength — guard it as thou wouldst a record.',
    ].join('\n\n')
  }
  if (topic === 'weakest') {
    if (!s.weakest)
      return 'No standard-bearing records yet stand to thy name — fight the great lifts (squat, bench, deadlift, press, row) and complete them fully, that I may judge thy balance against the frame that carries it.'
    return [
      `Thou askest where the armor is thinnest. The ${s.weakest.movement}: ${s.weakest.pr} ${units} stands to thy name, where a frame of ${vitals.bodyweight} ought command ${s.weakest.target}. Thou hast walked ${s.weakest.pct} parts in a hundred of that road.`,
      'Grant it the first slot of thy sessions, while strength is fresh. Two hard sets more each week, and add the smallest plate whenever all reps are conquered.',
    ].join('\n\n')
  }

  const paragraphs: (string | null)[] = [adherenceLine(s, battles.length)]

  /* the focus lift gets the prescription */
  if (s.focus) paragraphs.push(focusCounsel(s.focus, units))

  /* the trend, when it isn't about the same lift's stall */
  const trend = trendLine(s, units)
  if (trend && (!s.focus || !trend.includes(s.focus.movement) || s.focus.nextMove.kind === 'advance'))
    paragraphs.push(trend)

  /* the weakest work vs. the standards — only when it adds new counsel */
  if (s.weakest && s.weakest.pct < 100 && s.weakest.movement !== s.focus?.movement) {
    paragraphs.push(
      `And of thy balance: the ${s.weakest.movement} trails all else. ${s.weakest.pr} ${units} stands to thy name, where a frame of ${vitals.bodyweight} ought command ${s.weakest.target}. Grant it the first slot of thy sessions, while strength is fresh — thou hast walked ${s.weakest.pct} parts in a hundred of that road.`
    )
  }

  /* taper reading — kept from the old keeper, it was the one good line */
  const taperPct = Math.min((taperRatio / taperGoal) * 100, 100).toFixed(0)
  paragraphs.push(
    Number(taperPct) >= 95
      ? `Thy silhouette... the golden taper is nearly thine, ${taperPct} parts of a hundred. The ratio of legend bends toward thee.`
      : `Thy taper stands at ${taperRatio.toFixed(3)} against the fabled ${taperGoal} — ${taperPct} parts of a hundred walked. Widen the shoulders, guard the waist, and the V shall come.`
  )

  /* closer varies with the state of the fire */
  paragraphs.push(
    s.deloads.length > 0
      ? 'Rest is also training, ashen one. Go — and let the coals breathe.'
      : s.adherence.drifting
        ? 'One battle. That is all I ask of thee this day. The rest shall follow.'
        : 'Go now. The flame watches thy progress, and so do I.'
  )

  return paragraphs.filter(Boolean).join('\n\n')
}

/** simulated contemplation, so the UI's loading state is honest */
const ponder = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/* ----------------------------------------------------------------
   THE TRUE MIND — opt-in LLM narration, grounded in the signals.
   The engine computes every number; the model may only phrase them.
   Any reply containing a figure we did not supply is discarded and
   the deterministic voice speaks instead.
   ---------------------------------------------------------------- */

const QUESTION: Record<KeeperTopic, string> = {
  counsel: 'Give me thy full reading and counsel.',
  weakest: 'Which of my lifts is weakest, and how do I mend it?',
  stall: 'Why has my progress stalled, and what must I do?',
  cadence: 'Judge my training cadence.',
  next: 'Prescribe my next session, lift by lift.',
}

/** the structured, minimal fact sheet the model receives — numbers only */
function buildFacts(ctx: KeeperContext, s: CoachSignals, units: string): string {
  const a = s.adherence
  const move = (l: LiftSignal) => {
    const rx =
      l.nextMove.kind === 'advance'
        ? `advance to ${l.lastTopWeight + l.nextMove.addWeight} ${units} (+${l.nextMove.addWeight})`
        : l.nextMove.kind === 'hold'
          ? `hold ${l.lastTopWeight} ${units}, add pause reps`
          : `deload to ${l.nextMove.toWeight} ${units} x ${l.nextMove.toSets} sets`
    return `- ${l.movement}: last top ${l.lastTopWeight}x${l.lastTopReps} ${units}, best e1RM ${l.bestE1rm}, trend ${l.velocity >= 0 ? '+' : ''}${Math.round(l.velocity)} over ${l.spanDays} days, sessions without a new best: ${l.stallLen}, muscle fatigue ${Math.round(l.fatigue * 100)}%, prescription: ${rx}`
  }
  return [
    `Battles logged: ${ctx.battles.length}. Last battle ${a.daysSinceLast} days ago. ${a.battlesLast14} battles in 14 days, ${a.battlesLast42} in 42. Drifting: ${a.drifting ? 'yes' : 'no'}.`,
    `Bodyweight ${ctx.vitals.bodyweight}. Taper ratio ${ctx.taperRatio.toFixed(3)} toward ${ctx.taperGoal}.`,
    ...s.lifts.slice(0, 5).map(move),
    s.weakest
      ? `Weakest vs standards: ${s.weakest.movement} at ${s.weakest.pr} ${units} of a ${s.weakest.target} target (${s.weakest.pct}%).`
      : 'No lifts with standards on record.',
  ].join('\n')
}

/** every figure in the reply must have come from the fact sheet */
export function numbersGrounded(reply: string, facts: string): boolean {
  const allowed = new Set((facts.match(/\d+(?:\.\d+)?/g) ?? []).map(Number))
  for (const tok of reply.match(/\d+(?:\.\d+)?/g) ?? []) {
    const n = Number(tok)
    if (n <= 15 || n === 100) continue // reps, small counts, "parts of a hundred"
    if (!allowed.has(n)) return false
  }
  return true
}

async function narrateWithMind(
  ctx: KeeperContext,
  s: CoachSignals,
  units: string,
  topic: KeeperTopic
): Promise<string | null> {
  const key = getVisionKey()
  if (!key) return null
  const facts = buildFacts(ctx, s, units)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.85,
        max_tokens: 340,
        messages: [
          {
            role: 'system',
            content:
              KEEPER_PERSONA +
              ' CRITICAL: the FACTS block below is thy only source of numbers. Use only figures that appear there, verbatim — never compute, estimate, or invent a number. Answer the question asked, in 120-180 words, as flowing dialogue without headings or bullet lists.',
          },
          { role: 'user', content: `FACTS:\n${facts}\n\nQUESTION: ${QUESTION[topic]}` },
        ],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const text = data.choices?.[0]?.message?.content?.trim()
    if (text && text.length > 40 && numbersGrounded(text, facts)) return text
    return null // ungrounded or empty — the deterministic voice speaks
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/* ================================================================
   THE ENTRY POINT — deterministic counsel, with the opt-in True
   Mind narrating over it when attuned. The UI never changes.
   ================================================================ */
export async function seekGuidance(ctx: KeeperContext, topic: KeeperTopic = 'counsel'): Promise<string> {
  const local = generateLocally(ctx, topic)

  if (keeperMindEnabled() && hasVisionKey() && ctx.battles.length > 0) {
    const units = ctx.units ?? 'lb'
    const fatigue = ctx.fatigue ?? muscleFatigue(ctx.battles)
    const s = readSignals(ctx.battles, ctx.prs, ctx.vitals.bodyweight, fatigue, units, LOOKUPS)
    const minded = await narrateWithMind(ctx, s, units, topic)
    if (minded) return minded
  }

  await ponder(900 + Math.random() * 700)
  return local
}
