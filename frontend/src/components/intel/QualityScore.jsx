import ScoreRing from '../ScoreRing'
import { scoreColor } from '../../utils/constants'

const LABELS = { novelty: 'Novelty', technical_depth: 'Technical depth', industry_relevance: 'Industry relevance', research_potential: 'Research potential', feasibility: 'Feasibility', portfolio_value: 'Portfolio value' }

export default function QualityScore({ quality }) {
  if (!quality) return null
  return (
    <section className="card" aria-labelledby="q-h">
      <h3 id="q-h" className="mb-4 text-lg font-bold">ProjectForge score</h3>
      <div className="grid gap-6 md:grid-cols-[auto,1fr] md:items-center">
        <div className="mx-auto"><ScoreRing value={quality.final} label="Final score" size={120} unverified={!quality.noveltyVerified} /></div>
        <ul className="space-y-3">{Object.entries(LABELS).map(([k, label]) => <li key={k}>
          <div className="flex justify-between text-sm"><span className="font-medium">{label} <span className="text-xs text-ink-300">({Math.round((quality.weights?.[k] ?? 0) * 100)}%)</span></span><span className="tabular-nums">{quality.components[k].score}/100</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded bg-ink-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={quality.components[k].score}><div className="h-full rounded" style={{ width: `${quality.components[k].score}%`, background: scoreColor(quality.components[k].score) }} /></div>
          <p className="mt-0.5 text-xs text-ink-500">{quality.components[k].explanation}</p></li>)}</ul>
      </div>
      <p className="mt-4 rounded-lg bg-ink-50 p-3 text-xs text-ink-700"><b>How it is calculated:</b> {quality.formula}{!quality.noveltyVerified && ' Novelty is currently an unverified prior until the analysis runs against GitHub and papers.'}</p>
    </section>
  )
}
