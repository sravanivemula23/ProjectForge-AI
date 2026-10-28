import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { CardSkeletons, EmptyState, ErrorState, PageHeader } from '../components/ui'
import ProjectCard from '../components/ProjectCard'

const Section = ({ title, items, empty, to }) => (
  <section className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2>{to && <Link to={to} className="text-sm text-iris">View all</Link>}</div>
    {items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.slice(0, 3).map((p) => <ProjectCard key={p.id} p={p} />)}</div> : <EmptyState title={empty} text="Nothing here yet." />}</section>
)

export default function Dashboard() {
  const { user } = useAuth(); const [d, setD] = useState(null); const [err, setErr] = useState('')
  const load = () => api.dashboard().then(setD).catch((x) => setErr(x.message))
  useEffect(() => { load() }, [])
  if (err) return <ErrorState message={err} onRetry={load} />
  if (!d) return <CardSkeletons />
  return (
    <div>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Your project workspace" actions={<><Link className="btn-ghost" to="/analyze">Analyze an idea</Link><Link className="btn-signal" to="/generate">Generate ideas</Link></>} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><div className="text-sm text-ink-500">Profile completion</div><div className="mt-1 text-2xl font-bold">{d.profile_completion}%</div>
          <div className="mt-2 h-2 rounded bg-ink-100"><div className="h-full rounded bg-signal" style={{ width: `${d.profile_completion}%` }} /></div>{d.profile_completion < 80 && <Link to="/profile" className="mt-2 inline-block text-xs text-iris">Complete profile</Link>}</div>
        {[['Projects', d.counts.projects], ['Analyses run', d.counts.analyses], ['AI calls (30 days)', `${d.ai_usage.successful}/${d.ai_usage.calls_30d} ok`]].map(([k, v]) => <div key={k} className="card"><div className="text-sm text-ink-500">{k}</div><div className="mt-1 text-2xl font-bold">{v}</div></div>)}
      </div>
      <Section title="Recommended projects" items={d.recommended} empty="No recommendations" to="/library" />
      <Section title="Saved projects" items={d.saved} empty="No saved projects" to="/library" />
      <Section title="Favorites" items={d.favorites} empty="No favorites" />
      <section className="mb-8"><h2 className="mb-3 text-lg font-bold">Project intelligence</h2>
        {d.intelligence?.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{d.intelligence.map((i) => (
          <Link key={i.project_id} to={`/projects/${i.project_id}?tab=reality`} className="card block hover:border-iris"><div className="font-semibold">{i.title}</div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs"><span className="rounded bg-ink-50 px-2 py-0.5">Status: {i.progress}</span>{i.novelty != null && <span className="rounded bg-ink-50 px-2 py-0.5">Novelty {i.novelty}</span>}{i.quality != null && <span className="rounded bg-signal-light px-2 py-0.5">Score {i.quality}</span>}
              {i.reality_status && <span className="rounded bg-ink-50 px-2 py-0.5">Reality: {i.reality_status}</span>}{i.github_similar != null && <span className="rounded bg-ink-50 px-2 py-0.5">{i.github_similar} similar repos</span>}{i.papers != null && <span className="rounded bg-ink-50 px-2 py-0.5">{i.papers} papers</span>}{i.has_blueprint && <span className="rounded bg-iris-light px-2 py-0.5">Blueprint</span>}</div></Link>))}</div>
          : <EmptyState title="No intelligence analysis yet" text="Open a project and run the analysis to see novelty, GitHub and research insights here." />}</section>
      <section><h2 className="mb-3 text-lg font-bold">Recent analyses</h2>
        {d.recent_analyses.length ? <div className="card divide-y divide-ink-100">{d.recent_analyses.map((a) => (
          <Link key={a.id} to={`/projects/${a.project_id}?tab=novelty`} className="flex items-center justify-between py-2 text-sm hover:text-iris"><span>{a.title}</span>
            <span className="text-ink-500">{a.novelty_score == null ? 'no sources' : `novelty ${a.novelty_score} · similarity ${a.existing_similarity}%`}</span></Link>))}</div> : <EmptyState title="No analyses yet" text="Run a novelty analysis to see results here." />}</section>
    </div>
  )
}
