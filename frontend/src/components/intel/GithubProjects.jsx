import { useCallback, useEffect, useState } from 'react'
import { Github, GitFork, Star, ExternalLink, AlertTriangle } from 'lucide-react'
import { api } from '../../services/api'
import { Badge, EmptyState, Skeleton } from '../ui'

export const isGithubUrl = (u) => typeof u === 'string' && /^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(u)
const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'unknown')
const ACT = { active: ['signal', 'Active'], maintained: ['iris', 'Maintained'], stale: ['neutral', 'Stale'], archived: ['amber', 'Archived'] }

export function RepoCard({ repo }) {
  const [tone, label] = ACT[repo.activity] || ['neutral', 'Unknown']
  return (
    <article className="card flex flex-col gap-3" aria-label={`Repository ${repo.fullName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Github size={20} className="mt-0.5 shrink-0 text-ink-700" aria-hidden="true" />
          <div className="min-w-0"><h4 className="truncate font-display text-base font-bold">{repo.name}</h4><p className="truncate text-xs text-ink-500">{repo.owner}/{repo.name}</p></div>
        </div>
        <div className="shrink-0 text-right" title="Deterministic relevance to this project"><div className="text-xl font-bold tabular-nums">{repo.relevanceScore}%</div><div className="text-[10px] uppercase tracking-wide text-ink-500">Relevance</div></div>
      </div>
      <p className="line-clamp-3 min-h-[3.5rem] text-sm text-ink-700">{repo.description || 'No description provided.'}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-700">
        {repo.language && <Badge tone="iris">{repo.language}</Badge>}
        <span className="inline-flex items-center gap-1" aria-label={`${repo.stars.toLocaleString()} stars`}><Star size={13} aria-hidden="true" /> {repo.stars.toLocaleString()}</span>
        <span className="inline-flex items-center gap-1" aria-label={`${repo.forks.toLocaleString()} forks`}><GitFork size={13} aria-hidden="true" /> {repo.forks.toLocaleString()}</span>
        <Badge tone={tone}>{label}</Badge>{repo.archived && <Badge tone="amber">archived</Badge>}{repo.license && <Badge>{repo.license}</Badge>}
      </div>
      {repo.topics?.length > 0 && <div className="flex flex-wrap gap-1">{repo.topics.slice(0, 5).map((t) => <span key={t} className="rounded bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-500">{t}</span>)}</div>}
      <div className="mt-auto flex items-center justify-between pt-1 text-xs text-ink-500">
        <span>Updated {when(repo.updatedAt)}</span>
        {isGithubUrl(repo.url) ? <a href={repo.url} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-1 text-ink"><ExternalLink size={13} aria-hidden="true" /> View on GitHub</a> : <span>Link unavailable</span>}
      </div>
    </article>
  )
}

export const RepoSkeletons = () => (
  <div role="status" aria-live="polite"><p className="mb-3 text-sm text-ink-500">Finding related GitHub projects...</p>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-8 w-full" /></div>)}</div></div>
)

export default function GithubProjects({ projectId, initialVisible = 8 }) {
  const [state, setState] = useState({ loading: true })
  const [visible, setVisible] = useState(initialVisible)
  const load = useCallback(async (refresh = false) => {
    setState({ loading: true })
    try { setState({ loading: false, ...(await api.githubRelated(projectId, { limit: 20, refresh })) }) }
    catch { setState({ loading: false, status: 'unavailable', message: 'GitHub projects could not be loaded right now.', retryable: true, repositories: [] }) }
  }, [projectId])
  useEffect(() => { load() }, [load])

  if (state.loading) return <RepoSkeletons />
  const repos = state.repositories || []
  return (
    <section aria-labelledby="gh-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="gh-h" className="text-lg font-bold">Related GitHub projects</h3>
        {repos.length > 0 && <p className="text-xs text-ink-500">{state.summary?.retrieved ?? repos.length} unique repositories retrieved{state.cached ? ' (cached)' : ''} · data from the GitHub API</p>}
      </div>
      {(state.status === 'unavailable' || state.status === 'rate_limited') && (
        <div role="alert" className="card flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50"><AlertTriangle className="text-amber-700" size={18} aria-hidden="true" />
          <p className="flex-1 text-sm text-amber-900">{state.message || 'GitHub projects could not be loaded right now.'}</p><button className="btn-primary" onClick={() => load(true)}>Try Again</button></div>)}
      {state.status === 'partial' && <p role="status" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{state.message} <button className="underline" onClick={() => load(true)}>Try Again</button></p>}
      {state.status === 'empty' && <EmptyState title="No related repositories found" text={state.message || 'No related GitHub repositories were found for this idea.'} />}
      {repos.length > 0 && <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{repos.slice(0, visible).map((r) => <RepoCard key={r.fullName} repo={r} />)}</div>
        {repos.length > visible && <div className="mt-4 text-center"><button className="btn-ghost" onClick={() => setVisible((v) => v + 8)}>Show more ({repos.length - visible} more)</button></div>}
      </>}
    </section>
  )
}
