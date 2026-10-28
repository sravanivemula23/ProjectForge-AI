import { scoreColor } from '../utils/constants'

export default function ScoreRing({ value, label, size = 96, unverified = false }) {
  const v = value == null ? null : Math.max(0, Math.min(100, Math.round(value)))
  const r = (size - 12) / 2, c = 2 * Math.PI * r
  return (
    <figure className="flex flex-col items-center" aria-label={`${label}: ${v ?? 'not available'}`}>
      <svg width={size} height={size} role="img">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E4E9EF" strokeWidth="8" />
        {v != null && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(v)} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeOpacity={unverified ? 0.55 : 1} />}
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="font-display" fontSize={size / 3.6} fontWeight="700" fill="#0F1B2D">{v ?? '–'}</text>
      </svg>
      <figcaption className="mt-1 text-xs text-ink-500">{label}{unverified && <span title="Not yet verified against external sources"> (est.)</span>}</figcaption>
    </figure>
  )
}
