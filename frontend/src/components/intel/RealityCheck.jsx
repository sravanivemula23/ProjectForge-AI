import { Badge } from '../ui'

const TONE = { green: 'border-signal bg-signal-light', yellow: 'border-amber-300 bg-amber-50', red: 'border-red-300 bg-red-50', unknown: 'border-ink-100 bg-ink-50' }
const List = ({ title, items }) => items?.length ? <div><h4 className="mb-1 text-sm font-semibold">{title}</h4><ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-700">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null

export default function RealityCheck({ reality }) {
  if (!reality) return null
  const r = reality
  return (
    <section className={`card border-2 ${TONE[r.status] || TONE.unknown}`} aria-labelledby="rc-h">
      <h3 id="rc-h" className="text-lg font-bold">Project reality check</h3>
      <p className="mt-2 text-base font-semibold" role="status"><span aria-hidden="true">{r.icon}</span> {r.label}</p>
      {r.similarGithubCount != null && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-ink-500">Similar GitHub projects</dt><dd className="text-xl font-bold">{r.similarGithubCount}<span className="text-xs font-normal text-ink-500"> of {r.retrievedGithubCount} retrieved</span></dd></div>
          <div><dt className="text-ink-500">Actively maintained</dt><dd className="text-xl font-bold">{r.activeSimilarCount}</dd></div>
          <div><dt className="text-ink-500">Similar papers</dt><dd className="text-xl font-bold">{r.similarPapersCount}</dd></div>
          <div><dt className="text-ink-500">How common</dt><dd className="text-base font-bold">{r.technicalCommonness}</dd></div>
        </dl>)}
      {r.closestMatch && <p className="mt-4 text-sm"><b>Closest match:</b> <a href={r.closestMatch.url} target="_blank" rel="noopener noreferrer" className="text-iris hover:underline">{r.closestMatch.name}</a> <Badge tone="amber">{r.closestMatch.similarity}% similar</Badge></p>}
      {r.closestPaper && <p className="mt-1 text-sm"><b>Closest paper:</b> {r.closestPaper.url ? <a href={r.closestPaper.url} target="_blank" rel="noopener noreferrer" className="text-iris hover:underline">{r.closestPaper.title}</a> : r.closestPaper.title} <Badge tone="amber">{r.closestPaper.similarity}% similar</Badge></p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2"><List title="Already common" items={[...(r.commonFeatures || []), ...(r.commonTerms || [])]} /><List title="Appears less explored" items={r.lessExplored} /></div>
      <div className="mt-4 rounded-lg bg-white/70 p-3 text-sm"><b>Recommendation:</b> {r.recommendation}</div>
      {r.caveat && <p className="mt-2 text-xs text-amber-800">{r.caveat}</p>}
      <details className="mt-3 text-xs text-ink-500"><summary className="cursor-pointer">How is this decided?</summary><p className="mt-1">{r.methodology}</p></details>
    </section>
  )
}
