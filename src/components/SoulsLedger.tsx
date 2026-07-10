import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useGame, MOVEMENTS, localDayKey } from '../state/store'
import type { Movement } from '../state/store'
import EmptyWidget, { navigateTab } from './EmptyWidget'

/* ================================================================
   SOULS LEDGER — estimated 1RM over time, drawn in ember & gold
   ================================================================ */

const LINE_COLORS: Record<Movement, string> = {
  Squat: '#ff7518',
  Deadlift: '#e6c35c',
  'Bench Press': '#9db8c9',
  'Overhead Press': '#6b8f5e',
  'Barbell Row': '#dc2626',
}

const fmtDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type Point = { [key: string]: number | string | undefined; day: string }

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="border border-souls-dim/50 bg-void/80 backdrop-blur-md px-3 py-2">
      <div className="font-display text-[0.6rem] tracking-[0.2em] uppercase text-souls-dim mb-1">
        {label ? fmtDay(label) : ''}
      </div>
      {payload.map((e, i) => (
        <div key={i} className="font-ui text-xs flex items-center gap-2">
          <span className="inline-block w-2 h-2" style={{ background: e.color }} />
          <span className="text-bone-dim">{e.name}</span>
          <span className="text-souls ml-auto pl-3">{e.value} e1RM</span>
        </div>
      ))}
    </div>
  )
}

export default function SoulsLedger() {
  const battles = useGame((s) => s.battles)
  const units = useGame((s) => s.settings.units)

  const { data, present } = useMemo(() => {
    const byDay = new Map<string, Point>()
    for (const b of [...battles].reverse()) {
      const day = localDayKey(b.date)
      const row: Point = byDay.get(day) ?? { day }
      row[b.movement] = Math.max(Number(row[b.movement] ?? 0), b.e1rm)
      byDay.set(day, row)
    }
    const data = [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1))
    const present = MOVEMENTS.filter((m) => data.some((d) => d[m] !== undefined))
    return { data, present }
  }, [battles])

  /* Daily Combat Average — total tonnage per battle day, and the swing
     of the latest day against the one before it. */
  const stats = useMemo(() => {
    const vol = new Map<string, number>()
    for (const b of battles) {
      const day = localDayKey(b.date)
      vol.set(day, (vol.get(day) ?? 0) + b.volume)
    }
    const vals = [...vol.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map((e) => e[1])
    const avg = vals.length ? Math.round(vals.reduce((a, c) => a + c, 0) / vals.length) : 0
    const last = vals.at(-1) ?? 0
    const prev = vals.at(-2) ?? 0
    const deltaPct = prev > 0 ? ((last - prev) / prev) * 100 : 0
    return { avg, deltaPct, hasPrev: vals.length >= 2 }
  }, [battles])

  if (data.length < 2) {
    if (stats.avg > 0) {
      return (
        <div className="panel panel-ornate p-5 text-center">
          <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim mb-1">
            Daily Combat Average
          </div>
          <div className="stat-souls text-3xl leading-none">
            {stats.avg.toLocaleString()}
            <span className="text-sm text-souls-dim ml-1">{units} / day</span>
          </div>
          <p className="text-faded italic text-sm mt-3">
            One day stands in the ledger. Return tomorrow, and the lines will begin to rise.
          </p>
        </div>
      )
    }
    return (
      <EmptyWidget
        title="The Ledger Sleeps"
        body="No battles yet mark the ledger. Fight, and thy rising strength shall be drawn here in ember and gold."
        cta="Enter the Combat Log"
        onCta={() => navigateTab('combat')}
      />
    )
  }

  return (
    <div className="panel panel-ornate p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-display text-[0.65rem] tracking-[0.25em] uppercase text-souls-dim">
          Estimated 1RM &middot; {units}
        </span>
        <span className="font-ui text-[0.65rem] text-faded">last {data.length} battle days</span>
      </div>

      <div className="drop-shadow-[0_0_8px_rgba(255,117,24,0.25)]">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="#2e271e" strokeDasharray="2 6" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={fmtDay}
              stroke="#4d4335"
              tick={{ fill: '#6e6553', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
              tickLine={false}
              axisLine={{ stroke: '#2e271e' }}
            />
            <YAxis
              stroke="#4d4335"
              tick={{ fill: '#6e6553', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 15', 'dataMax + 15']}
            />
            <Tooltip content={<GlassTooltip />} cursor={{ stroke: '#4d4335', strokeDasharray: '3 3' }} />
            {present.map((m) => (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                stroke={LINE_COLORS[m]}
                strokeWidth={2}
                dot={{ r: 2.5, fill: LINE_COLORS[m], strokeWidth: 0 }}
                activeDot={{ r: 4, fill: LINE_COLORS[m] }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {present.map((m) => (
          <span key={m} className="font-ui text-[0.65rem] text-bone-dim flex items-center gap-1.5">
            <span className="inline-block w-2 h-2" style={{ background: LINE_COLORS[m] }} />
            {m}
          </span>
        ))}
      </div>

      {/* Daily Combat Average — tonnage per day, and the swing vs. the prior day */}
      <div className="mt-4 pt-4 border-t border-ash flex items-end justify-between">
        <div>
          <div className="font-display text-[0.6rem] tracking-[0.25em] uppercase text-souls-dim mb-1">
            Daily Combat Average
          </div>
          <div className="stat-souls text-2xl leading-none">
            {stats.avg.toLocaleString()}
            <span className="text-sm text-souls-dim ml-1">{units} / day</span>
          </div>
        </div>
        {stats.hasPrev && (
          <div className="text-right">
            <div
              className={`font-ui text-sm font-semibold ${
                stats.deltaPct >= 0 ? 'text-verdant' : 'text-blood-bright'
              }`}
            >
              {stats.deltaPct >= 0 ? '▲' : '▼'} {stats.deltaPct >= 0 ? '+' : ''}
              {stats.deltaPct.toFixed(1)}%
            </div>
            <div className="font-ui text-[0.6rem] text-faded mt-0.5">vs. prior day</div>
          </div>
        )}
      </div>
    </div>
  )
}
