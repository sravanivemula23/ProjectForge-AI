import { Badge } from '../ui'
import ScoreRing from '../ScoreRing'
import { scoreColor } from '../../utils/constants'

const LABELS = { github_uniqueness: 'GitHub uniqueness', feature_uniqueness: 'Feature uniqueness', research_uniqueness: 'Research uniqueness', technology_novelty: 'Technology novelty', market_differentiation: 'Market differentiation' }

export default function NoveltyBreakdown({ novelty }) {
  if (!novelty) return null
  return (
    <section className="card" aria-labelledby="nb-h">
      <h3 id="nb-h" className="mb-4 text-lg font-bold">Project novelty score</h3>
      <div className="mb-5 flex flex-wrap items-center gap-6">
        <ScoreRing value={novelty.overall} label="Overall novelty" size={110} />
        <div className="min-w-[220px] flex-1"><Badge tone={novelty.confidence === 'high' ? 'signal' : novelty.confidence === 'none' ? 'amber' : 'iris'}>confidence: {novelty.confidence}</Badge>
          <p className="mt-2 text-xs text-ink-500">{novelty.methodology}</p></div>
      </div>
      <ul className="space-y-4">
        {Object.entries(LABELS).map(([k, label]) => { const c = novelty.components?.[k]; if (!c) return null; return (
          <li key={k}>
            <div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span className="tabular-nums">{c.score == null ? 'Information unavailable' : `${c.score}/100`}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded bg-ink-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.score ?? 0}>{c.score != null && <div className="h-full rounded" style={{ width: `${c.score}%`, background: scoreColor(c.score) }} />}</div>
            <p className="mt-1 text-xs text-ink-500">{c.explanation}</p>
            {c.evidence?.filter((e) => e.url).length > 0 && <p className="mt-0.5 text-xs">Evidence: {c.evidence.filter((e) => e.url).slice(0, 2).map((e, i) => <a key={i} href={e.url} target="_blank" rel="noopener noreferrer" className="mr-2 text-iris hover:underline">{e.title}</a>)}</p>}
          </li>) })}
      </ul>
      <p className="mt-4 text-xs text-ink-500">{novelty.disclaimer}</p>
    </section>
  )
}
