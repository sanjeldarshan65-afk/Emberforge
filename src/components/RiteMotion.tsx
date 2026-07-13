/* ================================================================
   RITE MOTION — animated form demonstrations, sketched by the
   Fire Keeper. A fully articulated stick figure of stone and
   ember performs each rite in a slow loop, pausing a breath at
   lockout and at the bottom so both key positions read clearly.

   This file is rendering only. The skeleton solver + keyframe
   engine live in src/motion/rig.ts (pure, unit-tested) and the
   per-exercise pose data in src/motion/timelines.ts.

   A requestAnimationFrame loop writes the solved joint positions
   straight to the SVG each frame (no React re-renders). It runs
   only while mounted — the Codex modal — and pauses while the
   document is hidden. prefers-reduced-motion holds the lockout
   pose with a steady ember. All colors are CSS variables, so the
   normal and Hollowed Mode themes both apply.
   ================================================================ */

import { useEffect, useMemo, useRef } from 'react'
import type { Solved } from '../motion/rig'
import { FLOOR, L, sample, solve } from '../motion/rig'
import { timelineFor } from '../motion/timelines'

const pts = (...ps: [number, number][]) => ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

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

/* the implement — an end-on plate of ember, pulsed from the rAF loop */
function Ember() {
  return (
    <g data-n="ember">
      <circle r={7.5} fill="none" stroke="var(--color-ember)" strokeWidth="1.2" opacity={0.35} />
      <circle r={6} fill="var(--color-ember)" opacity={0.22} />
      <circle data-ember-core r={3.4} fill="var(--color-ember)" opacity={0.85} />
    </g>
  )
}

type NodeMap = Record<string, Element | null>

function apply(n: NodeMap, s: Solved, dynamicLegs: boolean) {
  if (dynamicLegs) {
    n.legN?.setAttribute('points', pts(s.ankle, s.knee, s.hip))
    n.legF?.setAttribute('points', pts([s.ankle[0] + 4, s.ankle[1]], [s.knee[0] + 4, s.knee[1]], [s.hip[0] + 4, s.hip[1]]))
    n.footN?.setAttribute('points', pts(s.ankle, s.footTip))
    n.footF?.setAttribute('points', pts([s.ankle[0] + 4, s.ankle[1]], [s.footTip[0] + 4, s.footTip[1]]))
    n.spine?.setAttribute('points', pts(s.hip, s.shoulder))
    n.head?.setAttribute('cx', String(s.head[0]))
    n.head?.setAttribute('cy', String(s.head[1]))
    for (const [id, p] of [['jHip', s.hip], ['jKnee', s.knee], ['jAnkle', s.ankle]] as const) {
      n[id]?.setAttribute('cx', String(p[0]))
      n[id]?.setAttribute('cy', String(p[1]))
    }
  }
  n.armN?.setAttribute('points', pts(s.shoulder, s.elbow, s.hand))
  n.armF?.setAttribute(
    'points',
    pts([s.shoulder[0] + 4, s.shoulder[1]], [s.elbow[0] + 4, s.elbow[1]], [s.hand[0] + 4, s.hand[1]])
  )
  for (const [id, p] of [['jShoulder', s.shoulder], ['jElbow', s.elbow]] as const) {
    n[id]?.setAttribute('cx', String(p[0]))
    n[id]?.setAttribute('cy', String(p[1]))
  }
  n.ember?.setAttribute('transform', `translate(${s.bar[0].toFixed(1)} ${s.bar[1].toFixed(1)})`)
}

const NODE_IDS = ['legN', 'legF', 'footN', 'footF', 'spine', 'head', 'armN', 'armF', 'jHip', 'jKnee', 'jAnkle', 'jShoulder', 'jElbow', 'ember']

export default function RiteMotion({ name }: { name: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tl = useMemo(() => timelineFor(name), [name])
  const isBench = tl.staging === 'bench'

  /* static staging bits, computed from key 0 */
  const still = useMemo(() => solve(tl, tl.keys[0].p), [tl])
  const bottom = useMemo(() => solve(tl, tl.keys[tl.keys.length - 1].p), [tl])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const n: NodeMap = Object.fromEntries(NODE_IDS.map((id) => [id, svg.querySelector(`[data-n="${id}"]`)]))
    const emberCore = svg.querySelector('[data-ember-core]')

    apply(n, still, !isBench) // the lockout still
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let last = performance.now()
    let clock = 0 // pauses while the document is hidden

    const frame = (now: number) => {
      clock += (now - last) / 1000
      last = now
      apply(n, solve(tl, sample(tl, clock)), !isBench)
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
  }, [tl, still, isBench])

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
        x1={still.bar[0]}
        y1={still.bar[1]}
        x2={bottom.bar[0]}
        y2={bottom.bar[1]}
        stroke="var(--color-ember)"
        strokeWidth="1"
        strokeDasharray="1.5 4"
        opacity="0.3"
      />

      {/* the floor */}
      <line x1="20" y1={FLOOR + 1.5} x2="140" y2={FLOOR + 1.5} stroke="var(--color-ash)" strokeWidth="2" opacity="0.55" />
      <ellipse cx="80" cy={FLOOR + 5} rx="36" ry="3.5" fill="var(--color-ember)" opacity="0.07" />

      {/* staging props */}
      {tl.overheadBar && (
        <line
          x1={tl.overheadBar[0] - 22}
          y1={tl.overheadBar[1]}
          x2={tl.overheadBar[0] + 22}
          y2={tl.overheadBar[1]}
          stroke="var(--color-ash)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {tl.seat && (
        <rect
          x={still.hip[0] - 12}
          y={still.hip[1] + 4}
          width={24}
          height={FLOOR - still.hip[1] - 4}
          fill="var(--color-iron)"
          stroke="var(--color-ash)"
          strokeWidth="1"
        />
      )}

      {isBench ? (
        <>
          {/* the bench and the lying body (head left, feet planted) */}
          <rect x="32" y="104" width="74" height="7" fill="var(--color-iron)" stroke="var(--color-ash)" strokeWidth="1" />
          <line x1="42" y1="111" x2="42" y2={FLOOR} stroke="var(--color-ash)" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="96" y1="111" x2="96" y2={FLOOR} stroke="var(--color-ash)" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="44" cy="94" r={L.headR} fill="var(--color-charcoal)" stroke="var(--color-stone)" strokeWidth="2.5" />
          <polyline points="53,97 92,99" {...STROKE} strokeWidth={5.5} />
          <polyline points="92,99 108,118 112,140" {...STROKE} />
          <Joint cx={92} cy={99} />
          <Joint cx={108} cy={118} />
          <g opacity="0.3">
            <polyline data-n="armF" {...STROKE} strokeWidth={4} />
          </g>
          <polyline data-n="armN" {...STROKE} strokeWidth={4} />
          <Joint id="jShoulder" />
          <Joint id="jElbow" />
        </>
      ) : (
        <>
          {/* far side, dim and offset, for depth */}
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
      )}

      <Ember />
    </svg>
  )
}
