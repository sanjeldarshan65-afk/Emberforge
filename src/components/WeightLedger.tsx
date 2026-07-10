import { useMemo } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { useGame } from '../state/store'

/* ================================================================
   THE VESSEL'S BURDEN — bodyweight over time
   A weigh-in is recorded whenever measurements are sealed.
   ================================================================ */

const fmtDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value?: number }[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="border border-souls-dim/50 bg-void/80 backdrop-blur-md px-3 py-2">
      <div className="font-display text-[0.6rem] tracking-[0.2em] uppercase text-souls-dim">
        {label ? fmtDay(label) : ''}
      </div>
      <div className="stat-souls text-base">{payload[0]?.value}</div>
    </div>
  )
}

export default function WeightLedger() {
  const weighIns = useGame((s) => s.weighIns)
  const units = useGame((s) => s.settings.units)

  const data = useMemo(
    () => [...weighIns].sort((a, b) => (a.date < b.date ? -1 : 1)),
    [weighIns]
  )

  if (data.length < 2) {
    return (
      <div className="panel p-5 text-center">
        <p className="text-bone-dim italic text-sm">
          Seal thy measurements on different days, and the burden's course shall be drawn here.
        </p>
      </div>
    )
  }

  const first = data[0].weight
  const last = data[data.length - 1].weight
  const delta = last - first

  return (
    <div className="panel panel-ornate p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-display text-[0.65rem] tracking-[0.25em] uppercase text-souls-dim">
          Bodyweight &middot; {units}
        </span>
        <span
          className={`font-ui text-xs ${
            delta < 0 ? 'text-verdant' : delta > 0 ? 'text-glow-ember' : 'text-faded'
          }`}
        >
          {delta === 0 ? 'unchanged' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} since ${fmtDay(data[0].date)}`}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={170}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="burdenFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e6c35c" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#e6c35c" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
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
            domain={['dataMin - 3', 'dataMax + 3']}
          />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: '#4d4335', strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey="weight"
            stroke="#e6c35c"
            strokeWidth={2}
            fill="url(#burdenFill)"
            dot={{ r: 2.5, fill: '#e6c35c', strokeWidth: 0 }}
            activeDot={{ r: 4, fill: '#ffa04d' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
