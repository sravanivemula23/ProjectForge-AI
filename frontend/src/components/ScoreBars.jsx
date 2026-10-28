import { SCORE_LABELS, scoreColor } from '../utils/constants'

export default function ScoreBars({ scores, explanations = {}, novelty_verified }) {
  return (
    <div className="space-y-3">
      {Object.entries(SCORE_LABELS).map(([k, label]) => scores?.[k] != null && (
        <div key={k}>
          <div className="flex justify-between text-sm"><span className="font-medium">{label}{k === 'novelty' && !novelty_verified && <span className="ml-1 text-xs text-amber-700">(unverified prior)</span>}</span><span className="tabular-nums">{scores[k]}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded bg-ink-100" role="progressbar" aria-valuenow={scores[k]} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <div className="h-full rounded" style={{ width: `${scores[k]}%`, background: scoreColor(k === 'difficulty' ? 100 - scores[k] : scores[k]) }} />
          </div>
          {explanations[k] && <p className="mt-1 text-xs text-ink-500">{explanations[k]}</p>}
        </div>
      ))}
    </div>
  )
}
