import type { MediaCandidate } from '@/types'
import { getScoreBreakdown } from '@/lib/score-breakdown'

const CENTER = 120
const MAX_RADIUS = 78
const AXES = 6

const getPoint = (index: number, radius: number) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / AXES

  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  }
}

const buildPolygonPoints = (values: number[]) =>
  values
    .map((value, index) => {
      const point = getPoint(index, (value / 100) * MAX_RADIUS)
      return `${point.x},${point.y}`
    })
    .join(' ')

export default function ScoreRadarChart({
  media,
  targetLabel = '現在の案件',
  compact = false,
}: {
  media: MediaCandidate
  targetLabel?: string
  compact?: boolean
}) {
  const breakdown = getScoreBreakdown(media)
  const axisPoints = breakdown.map((_, index) => getPoint(index, MAX_RADIUS))
  const polygonPoints = buildPolygonPoints(breakdown.map((item) => item.value))

  return (
    <div className={compact ? 'grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]' : 'space-y-4'}>
      <div className="mx-auto w-full max-w-[240px]">
        <svg viewBox="0 0 240 240" role="img" aria-label={`${media.media_name} のスコア詳細チャート`}>
          {[1, 0.75, 0.5, 0.25].map((ratio) => (
            <polygon
              key={ratio}
              points={axisPoints
                .map((_, index) => {
                  const point = getPoint(index, MAX_RADIUS * ratio)
                  return `${point.x},${point.y}`
                })
                .join(' ')}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          ))}
          {axisPoints.map((point, index) => (
            <line
              key={breakdown[index].key}
              x1={CENTER}
              y1={CENTER}
              x2={point.x}
              y2={point.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          ))}
          <polygon
            points={polygonPoints}
            fill="rgba(13, 148, 136, 0.22)"
            stroke="#0f766e"
            strokeWidth="2"
          />
          {breakdown.map((item, index) => {
            const dot = getPoint(index, (item.value / 100) * MAX_RADIUS)
            const labelPoint = getPoint(index, MAX_RADIUS + 22)

            return (
              <g key={item.key}>
                <circle cx={dot.x} cy={dot.y} r="4" fill="#0f766e" />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-500 text-[10px] font-semibold"
                >
                  {item.label}
                </text>
              </g>
            )
          })}
          <text
            x={CENTER}
            y={CENTER - 2}
            textAnchor="middle"
            className="fill-slate-900 text-[24px] font-bold"
          >
            {media.fit_score}
          </text>
          <text
            x={CENTER}
            y={CENTER + 16}
            textAnchor="middle"
            className="fill-slate-500 text-[9px] font-semibold"
          >
            {targetLabel}
          </text>
        </svg>
      </div>

      <div className="space-y-2">
        {breakdown.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700">{item.label}</p>
              <p className="truncate text-[11px] text-slate-400">{item.note}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
