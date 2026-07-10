import { useGame } from '../state/store'

/* ================================================================
   SOUND OF THE FORGE — pure Web Audio synthesis, no samples
   Every function is safe to call anywhere; silent when muted.
   ================================================================ */

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

const enabled = () => useGame.getState().settings.sound

/** heavy stone thud — a set is sealed */
export function thud() {
  if (!enabled()) return
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const lp = c.createBiquadFilter()
  const gain = c.createGain()
  lp.type = 'lowpass'
  lp.frequency.value = 220
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(95, t)
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.16)
  gain.gain.setValueAtTime(0.55, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  osc.connect(lp).connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.24)
}

/** metallic shing — a blade drawn between tabs */
export function shing() {
  if (!enabled()) return
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const hp = c.createBiquadFilter()
  const gain = c.createGain()
  hp.type = 'highpass'
  hp.frequency.value = 1800
  gain.gain.setValueAtTime(0.04, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
  hp.connect(gain).connect(c.destination)
  for (const f of [2600, 3900, 5200]) {
    const o = c.createOscillator()
    o.type = 'square'
    o.frequency.setValueAtTime(f, t)
    o.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.09)
    o.connect(hp)
    o.start(t)
    o.stop(t + 0.17)
  }
}

/** resonant toll with a fiery undertone — the battle ends, souls flow */
export function toll() {
  if (!enabled()) return
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const partials: [number, number][] = [
    [196, 0.26],
    [392, 0.11],
    [588, 0.045],
  ]
  for (const [f, v] of partials) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.value = f
    g.gain.setValueAtTime(v, t)
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.4)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + 1.45)
  }
  /* the whoosh beneath */
  const o = c.createOscillator()
  const lp = c.createBiquadFilter()
  const g = c.createGain()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(400, t)
  lp.frequency.exponentialRampToValueAtTime(90, t + 0.7)
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(70, t)
  o.frequency.exponentialRampToValueAtTime(32, t + 0.7)
  g.gain.setValueAtTime(0.09, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.75)
  o.connect(lp).connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 0.8)
}

export const useSound = () => ({ thud, shing, toll })
