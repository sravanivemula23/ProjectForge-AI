import { Sparkles } from 'lucide-react'
import { Badge, Notice, Spinner } from '../ui'

export default function Differentiation({ data, busy, onGenerate, onImprove, improving }) {
  const s = data?.suggestions || []
  return (
    <section className="card" aria-labelledby="df-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 id="df-h" className="text-lg font-bold">Make this project more unique</h3>
        <div className="flex gap-2"><button className="btn-ghost" onClick={onGenerate} disabled={busy}>{busy ? <Spinner /> : <Sparkles size={15} aria-hidden="true" />} {s.length ? 'Regenerate' : 'Suggest improvements'}</button>
          {s.length > 0 && <button className="btn-signal" onClick={onImprove} disabled={improving}>{improving && <Spinner />} Generate improved version</button>}</div></div>
      {!s.length && <p className="text-sm text-ink-500">Get relevant, project-specific ideas for standing out. Features are only suggested when they fit your project.</p>}
      {data?.note && <div className="mb-3"><Notice>{data.note}</Notice></div>}
      <ul className="space-y-3">{s.map((x) => (
        <li key={x.id} className="rounded-lg border border-ink-100 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><b>{x.feature}</b><span className="flex gap-1.5"><Badge tone={x.technical_difficulty === 'High' ? 'amber' : x.technical_difficulty === 'Low' ? 'signal' : 'iris'}>{x.technical_difficulty} difficulty</Badge><Badge tone="signal">+{x.expected_originality_improvement.points} originality (est.)</Badge></span></div>
          <p className="mt-1 text-ink-700"><span className="font-medium">Why it helps:</span> {x.why}</p>
          <p className="mt-0.5 text-xs text-ink-500">Originality estimate basis: {x.expected_originality_improvement.basis}. {x.origin === 'llm' ? 'AI-suggested.' : 'Template suggestion filtered for relevance.'}</p></li>))}</ul>
    </section>
  )
}
