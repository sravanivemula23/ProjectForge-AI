import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, AlertTriangle } from 'lucide-react'
import { api } from '../../services/api'
import { Badge, EmptyState, Skeleton } from '../ui'

const FIELDS = [['methodology', 'Methodology'], ['dataset', 'Dataset'], ['mainResult', 'Main result'], ['limitations', 'Limitations'], ['futureWork', 'Future work']]
export const Unavailable = () => <span className="italic text-ink-300">Information unavailable</span>
const safe = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null)

export function PaperCard({ p }) {
  return (
    <article className="card space-y-2" aria-label={`Paper ${p.title}`}>
      <div className="flex items-start justify-between gap-3"><h4 className="font-display text-base font-bold leading-snug">{p.title}</h4><Badge tone="iris">{p.relevanceScore}% relevant</Badge></div>
      <p className="text-xs text-ink-500">{p.authors?.length ? p.authors.join(', ') : <Unavailable />} · {p.year ?? <Unavailable />} · {p.venue || <Unavailable />} · via {p.source}</p>
      <div className="text-xs">{p.doi ? <>DOI: <a href={safe(p.link)} target="_blank" rel="noopener noreferrer" className="text-iris hover:underline">{p.doi} <ExternalLink className="inline" size={11} aria-hidden="true" /></a></> : safe(p.link) ? <a href={safe(p.link)} target="_blank" rel="noopener noreferrer" className="text-iris hover:underline">Open paper <ExternalLink className="inline" size={11} aria-hidden="true" /></a> : <>DOI/link: <Unavailable /></>}</div>
      {p.hasAbstract === false ? <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-500">{p.source} did not provide an abstract for this paper, so methodology, dataset, results, limitations and future work cannot be extracted.</p> : (
      <dl className="grid gap-2 text-sm md:grid-cols-2">{FIELDS.map(([k, l]) => <div key={k}><dt className="text-xs font-semibold text-ink-500">{l}</dt><dd>{p[k]?.text ? <q className="not-italic text-ink-700">{p[k].text}</q> : <Unavailable />}</dd></div>)}</dl>)}
      {p.hasAbstract !== false && <p className="text-[11px] text-ink-300">Sentences are quoted from the paper's abstract as provided by {p.source}.</p>}
    </article>
  )
}

export function GapAnalysis({ gap }) {
  if (!gap) return null
  if (!gap.available) return <section className="card" aria-labelledby="gap-h"><h3 id="gap-h" className="text-lg font-bold">Research gap analysis</h3><p className="mt-2 text-sm text-ink-500">Information unavailable: {gap.reason}</p></section>
  return (
    <section className="card space-y-4" aria-labelledby="gap-h">
      <h3 id="gap-h" className="text-lg font-bold">Research gap analysis</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div><h4 className="mb-1 font-semibold">Existing research mentions</h4>{gap.existing.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{gap.existing.map((e) => <li key={e.aspect}>{e.aspect} <span className="text-xs text-ink-500">({e.papers} paper{e.papers > 1 ? 's' : ''})</span></li>)}</ul> : <p className="text-sm text-ink-500">No tracked aspects were found in the retrieved abstracts.</p>}</div>
        <div><h4 className="mb-1 font-semibold">Potential gaps</h4>{gap.gaps.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{gap.gaps.map((g) => <li key={g.id}><b>{g.aspect}</b><span className="block text-xs text-ink-500">{g.why}</span></li>)}</ul> : <p className="text-sm text-ink-500">No relevant gaps detected in the retrieved abstracts.</p>}</div>
      </div>
      {gap.suggestedContribution && <div className="rounded-lg bg-iris-light p-3 text-sm"><b>What can your project improve?</b><p className="mt-1">{gap.suggestedContribution}</p></div>}
      <p className="text-xs text-ink-500">{gap.caveat}</p>
    </section>
  )
}

export default function ResearchPapers({ projectId }) {
  const [s, setS] = useState({ loading: true })
  const load = useCallback(async (refresh = false) => {
    setS({ loading: true })
    try { setS({ loading: false, ...(await api.researchRelated(projectId, { refresh })) }) } catch { setS({ loading: false, status: 'unavailable', message: 'Research papers could not be loaded right now.', papers: [] }) }
  }, [projectId])
  useEffect(() => { load() }, [load])
  if (s.loading) return <div role="status" aria-live="polite"><p className="mb-3 text-sm text-ink-500">Finding related research papers...</p><div className="space-y-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div></div>
  return (
    <div className="space-y-4">
      {s.status === 'unavailable' && <div role="alert" className="card flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50"><AlertTriangle className="text-amber-700" size={18} aria-hidden="true" /><p className="flex-1 text-sm text-amber-900">{s.message}</p><button className="btn-primary" onClick={() => load(true)}>Try Again</button></div>}
      {s.status === 'partial' && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{s.message} <button className="underline" onClick={() => load(true)}>Try Again</button></p>}
      {s.status === 'empty' && <EmptyState title="No related papers found" text={s.message} />}
      {s.papers?.length > 0 && <><p className="text-xs text-ink-500">{s.note}</p><div className="space-y-3">{s.papers.map((p) => <PaperCard key={p.link || p.title} p={p} />)}</div></>}
      <GapAnalysis gap={s.gap} />
    </div>
  )
}
