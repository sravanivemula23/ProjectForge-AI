import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Bookmark, Download, ExternalLink, Heart, Sparkles, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { Badge, CardSkeletons, EmptyState, ErrorState, Notice, Spinner } from '../components/ui'
import ScoreRing from '../components/ScoreRing'
import ScoreBars from '../components/ScoreBars'
import ArchitectureDiagram from '../components/ArchitectureDiagram'
import { useIntelligence } from '../hooks/useIntelligence'
import GithubProjects from '../components/intel/GithubProjects'
import ResearchPapers from '../components/intel/ResearchPapers'
import NoveltyBreakdown from '../components/intel/NoveltyBreakdown'
import RealityCheck from '../components/intel/RealityCheck'
import Differentiation from '../components/intel/Differentiation'
import QualityScore from '../components/intel/QualityScore'
import FeasibilityCard from '../components/intel/FeasibilityCard'
import BlueprintView from '../components/intel/BlueprintView'
import WeeklyPlan from '../components/intel/WeeklyPlan'

const PROGRESS = ['idea', 'researching', 'planning', 'building', 'testing', 'done']

const TABS = [['overview', 'Overview'], ['reality', 'Reality check'], ['github', 'GitHub'], ['research', 'Research'], ['novelty', 'Novelty analysis'], ['improve', 'Improve'], ['blueprint', 'Blueprint'], ['roadmap', 'Roadmap'], ['architecture', 'Architecture'], ['docs', 'Documentation']]

const List = ({ title, items }) => items?.length ? <div><h4 className="mb-1 font-semibold">{title}</h4><ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null

function SourceList({ title, items }) {
  if (!items.length) return null
  return (
    <div className="card"><h4 className="mb-3 font-semibold">{title} <Badge tone="signal">verified external</Badge></h4>
      <ul className="divide-y divide-ink-100">{items.slice(0, 10).map((s, i) => (
        <li key={i} className="py-2 text-sm"><div className="flex items-start justify-between gap-3">
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-iris hover:underline">{s.title} <ExternalLink className="inline" size={12} /></a>
          <Badge tone={s.similarity >= 60 ? 'amber' : 'neutral'}>{s.similarity}% similar</Badge></div>
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{s.description || s.abstract || 'No description provided'}</p>
          <p className="mt-0.5 text-xs text-ink-300">{s.source}{s.published ? ` · ${s.published}` : ''}{s.stars != null ? ` · ★ ${s.stars}` : ''}{s.citations != null ? ` · ${s.citations} citations` : ''}</p></li>))}</ul></div>
  )
}

function Novelty({ p, run, busy }) {
  const a = p.analysis
  if (!a) return <EmptyState title="Not analyzed yet" text="Search GitHub, Semantic Scholar, OpenAlex, arXiv and Crossref and compare them with your idea using embeddings."
    action={<button className="btn-signal" onClick={run} disabled={busy}>{busy && <Spinner />} Run novelty analysis</button>} />
  const failed = Object.entries(a.sources_status).filter(([, v]) => !v.ok)
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-8">
        <ScoreRing value={a.existing_similarity} label="Existing similarity %" size={110} />
        <ScoreRing value={a.novelty_score} label="Estimated novelty" size={110} />
        <div className="min-w-[240px] flex-1"><Badge tone={a.confidence === 'high' ? 'signal' : a.confidence === 'none' ? 'amber' : 'iris'}>confidence: {a.confidence}</Badge>
          <p className="mt-2 text-sm">{a.summary.similarity_explanation}</p><p className="mt-2 text-xs text-ink-500">Similarity engine: {a.embedding_backend}</p></div>
        <button className="btn-ghost" onClick={run} disabled={busy}>{busy && <Spinner />} Re-run</button>
      </div>
      <Notice tone="warn">{a.summary.disclaimer}</Notice>
      {failed.length > 0 && <Notice tone="warn">Some sources failed and are not included: {failed.map(([k, v]) => `${k} (${v.error})`).join('; ')}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-4"><h3 className="font-semibold">What exists <Badge tone="signal">derived from retrieved sources</Badge></h3>
          <List title="Common features" items={a.summary.common_features} /><List title="Technical limitations" items={a.summary.technical_limitations} /><List title="Research gaps" items={a.summary.research_gaps} /></div>
        <div className="card space-y-4"><h3 className="font-semibold">Gaps & opportunities <Badge tone="iris">{a.suggestion_origin === 'llm' ? 'AI-generated' : 'template-generated'}</Badge></h3>
          <List title="Missing features" items={a.summary.missing_features} /><List title="New datasets" items={a.summary.new_datasets} /><List title="New algorithms" items={a.summary.new_algorithms} />
          <List title="New user groups" items={a.summary.new_user_groups} /><List title="New deployment methods" items={a.summary.new_deployment_methods} /><List title="New integrations" items={a.summary.new_integrations} /></div>
      </div>
      <div className="card"><h3 className="mb-3 font-semibold">How to make this project more innovative</h3>
        <ol className="space-y-3">{a.summary.improvements.map((i, k) => <li key={k} className="text-sm"><b>{i.title}</b> <Badge>{i.category}</Badge><p className="text-ink-500">{i.rationale}</p></li>)}</ol></div>
      {a.summary.corpus_matches?.length > 0 && <div className="card"><h4 className="mb-2 font-semibold">Also seen in earlier analyses <Badge tone="iris">{a.summary.corpus_search === 'mongodb_vector_search' ? 'MongoDB Vector Search' : 'in-process similarity'}</Badge></h4>
        <ul className="space-y-1 text-sm">{a.summary.corpus_matches.map((m, i) => <li key={i}><a href={m.url} target="_blank" rel="noopener noreferrer" className="text-iris hover:underline">{m.title}</a> <span className="text-xs text-ink-500">({m.source}, {m.similarity}% similar)</span></li>)}</ul></div>}
      <SourceList title="Similar projects" items={a.similar_projects} /><SourceList title="Research papers" items={a.research_papers} />
      <details className="text-xs text-ink-500"><summary className="cursor-pointer">Methodology</summary><p className="mt-1">{a.summary.methodology}</p></details>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams(); const nav = useNavigate(); const [qs, setQs] = useSearchParams()
  const tab = qs.get('tab') || 'overview'
  const [p, setP] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState('')
  const [improved, setImproved] = useState(null)
  const intel = useIntelligence(id)
  const load = useCallback(async () => { try { setErr(''); setP(await api.project(id)) } catch (x) { setErr(x.message) } }, [id])
  useEffect(() => { setP(null); load() }, [load])
  const act = async (name, fn) => { setBusy(name); try { await fn(); await load() } catch (x) { toast.error(x.message) } finally { setBusy('') } }

  if (err) return <ErrorState message={err} onRetry={load} />
  if (!p) return <CardSkeletons n={1} />
  const s = p.scores, d = p.data
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl"><div className="mb-2 flex flex-wrap gap-1.5"><Badge tone="signal">{p.domain}</Badge><Badge>{p.difficulty}</Badge>{p.is_demo && <Badge tone="amber">demo template</Badge>}{p.origin === 'template' && !p.is_demo && <Badge tone="amber">template idea</Badge>}{p.version > 1 && <Badge tone="iris">v{p.version}</Badge>}</div>
          <h1 className="text-2xl font-bold md:text-3xl">{p.title}</h1><p className="mt-2 text-ink-500">{p.short_description}</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => act('fav', () => api.favorite(p.id))}><Heart size={16} className={p.is_favorite ? 'fill-red-500 text-red-500' : ''} /> Favorite</button>
          <button className="btn-ghost" onClick={() => act('save', () => (p.is_saved ? api.unsave(p.id) : api.save(p.id)))}><Bookmark size={16} className={p.is_saved ? 'fill-iris text-iris' : ''} /> {p.is_saved ? 'Saved' : 'Save'}</button>
          <div className="relative inline-block"><select aria-label="Export" className="btn-ghost appearance-none pr-3" value="" onChange={(e) => e.target.value && api.download(p.id, e.target.value).catch((x) => toast.error(x.message))}>
            <option value="">Export…</option><option value="md">Markdown</option><option value="html">HTML (print to PDF)</option><option value="json">JSON</option></select></div>
          <select aria-label="Progress status" className="btn-ghost appearance-none pr-3" value={p.progress || 'idea'} onChange={(e) => api.setProgress(p.id, e.target.value).then(() => setP({ ...p, progress: e.target.value })).catch((x) => toast.error(x.message))}>
            {PROGRESS.map((s) => <option key={s} value={s}>Status: {s}</option>)}</select>
          <Link className="btn-ghost" to={`/compare?ids=${p.id}`}>Compare</Link>
          <button className="btn-ghost text-red-600" onClick={async () => { if (confirm('Delete this project?')) { await api.deleteProject(p.id); toast.success('Deleted'); nav('/library') } }}><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-100" role="tablist">{TABS.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setQs({ tab: k })} className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-signal text-signal-dark' : 'border-transparent text-ink-500'}`}>{l}</button>))}</div>

      {tab === 'overview' && <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-1"><div className="mb-4 flex items-center gap-4"><ScoreRing value={s?.overall} label="Overall" size={96} /><p className="text-xs text-ink-500">Weighted from the scores below ({s?.methodology}). Difficulty is informational.</p></div>
          {s && <ScoreBars {...s} />}</div>
        <div className="card space-y-4 text-sm lg:col-span-2">
          <div><h4 className="font-semibold">Problem statement</h4><p className="text-ink-700">{d.problem_statement || '—'}</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><List title="Target users" items={d.target_users} /><List title="Required skills" items={d.required_skills} /><List title="Technologies" items={d.technologies} /><List title="AI/ML components" items={d.ai_ml_components} />
            <List title="Main modules" items={d.modules} /><List title="Deployment options" items={d.deployment_options} /><List title="Innovation opportunities" items={d.innovation_opportunities} /></div>
          <p><b>Expected output:</b> {d.expected_output}</p><p><b>Time:</b> ~{d.estimated_weeks} weeks · <b>Estimated cost:</b> ${d.estimated_cost_usd}</p>
          <p className="text-ink-500">{d.career_relevance_note} {d.research_potential_note}</p></div></div>}

      {tab === 'overview' && (
        <div className="mt-4 space-y-4">
          {intel.data?.quality ? <QualityScore quality={intel.data.quality} /> : (
            <div className="card flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Run the full intelligence analysis to get the ProjectForge Score, novelty breakdown, reality check and feasibility, based on real GitHub and research evidence.</p>
              <button className="btn-signal" disabled={intel.busy === 'novelty'} onClick={() => intel.run('novelty', () => api.novelty(p.id))}>{intel.busy === 'novelty' ? <Spinner /> : <Sparkles size={16} />} Run analysis</button></div>)}
          {intel.data?.feasibility && <FeasibilityCard f={intel.data.feasibility} />}
        </div>)}

      {tab === 'reality' && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Checks GitHub and research papers to see whether your idea already exists.</p>
            <button className="btn-signal" disabled={intel.busy === 'novelty'} onClick={() => intel.run('novelty', () => api.novelty(p.id, !!intel.data?.novelty))}>{intel.busy === 'novelty' ? <Spinner /> : <Sparkles size={16} />} {intel.data?.novelty ? 'Re-run analysis' : 'Run analysis'}</button></div>
          {intel.data?.reality_check ? <RealityCheck reality={intel.data.reality_check} /> : intel.data && <EmptyState title="No reality check yet" text="Run the analysis to see whether similar projects and papers exist." />}
          <NoveltyBreakdown novelty={intel.data?.novelty} />
          <Differentiation data={intel.data?.differentiation} busy={intel.busy === 'diff'} onGenerate={() => intel.run('diff', () => api.differentiate(p.id))} improving={busy === 'imp'}
            onImprove={async () => { setBusy('imp'); try { const r = await api.improve(p.id); toast.success('Improved version created'); nav(`/projects/${r.improved.id}`) } catch (x) { toast.error(x.message) } finally { setBusy('') } }} />
        </div>)}

      {tab === 'github' && <GithubProjects projectId={p.id} />}
      {tab === 'research' && <ResearchPapers projectId={p.id} />}

      {tab === 'blueprint' && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Generate the complete blueprint (22 sections) and feasibility analysis for this project.</p>
            <div className="flex gap-2"><button className="btn-ghost" disabled={intel.busy === 'feas'} onClick={() => intel.run('feas', () => api.feasibility(p.id))}>{intel.busy === 'feas' && <Spinner />} Feasibility</button>
              <button className="btn-signal" disabled={intel.busy === 'bp'} onClick={() => intel.run('bp', () => api.blueprint(p.id))}>{intel.busy === 'bp' && <Spinner />} {intel.data?.blueprint ? 'Regenerate blueprint' : 'Generate blueprint'}</button></div></div>
          <FeasibilityCard f={intel.data?.feasibility} />
          <BlueprintView blueprint={intel.data?.blueprint} />
          {intel.data && !intel.data.blueprint && <EmptyState title="No blueprint yet" text="Generate a complete project blueprint grounded in the evidence collected for this project." />}
        </div>)}

      {tab === 'novelty' && <Novelty p={p} busy={busy === 'an'} run={() => act('an', () => api.analyze({ project_id: p.id }))} />}

      {tab === 'improve' && <div className="space-y-4">
        <div className="card flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Turn this into a stronger project. Run a novelty analysis first for gap-aware improvements.</p>
          <button className="btn-signal" disabled={busy === 'imp'} onClick={async () => { setBusy('imp'); try { const r = await api.improve(p.id); setImproved(r); toast.success('Improved version created') } catch (x) { toast.error(x.message) } finally { setBusy('') } }}>{busy === 'imp' ? <Spinner /> : <Sparkles size={16} />} Improve this project</button></div>
        {improved && <div className="grid gap-4 md:grid-cols-2"><div className="card"><Badge>Basic idea</Badge><h3 className="mt-2 font-bold">{improved.original.title}</h3><p className="mt-1 text-sm text-ink-500">{improved.original.short_description}</p></div>
          <div className="card border-signal"><Badge tone="signal">Improved idea (v{improved.improved.version})</Badge><h3 className="mt-2 font-bold">{improved.improved.title}</h3><p className="mt-1 text-sm text-ink-500">{improved.improved.short_description}</p>
            <Link to={`/projects/${improved.improved.id}`} className="btn-primary mt-3">Open improved project</Link></div>
          <div className="card md:col-span-2"><h4 className="mb-2 font-semibold">What was added and why</h4>{improved.notice && <Notice tone="warn">{improved.notice}</Notice>}<ul className="space-y-2 text-sm">{improved.added_features.map((f, i) => <li key={i}><b>{f.feature}</b><p className="text-ink-500">{f.why}</p></li>)}</ul></div></div>}</div>}

      {tab === 'roadmap' && (p.roadmap ? <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm text-ink-500">Total ≈ {p.roadmap.data.total_weeks} weeks</p><button className="btn-ghost" disabled={busy === 'rm'} onClick={() => act('rm', () => api.roadmap(p.id))}>{busy === 'rm' && <Spinner />} Regenerate</button></div>
        {p.roadmap.data.weekly_plan && <WeeklyPlan plan={p.roadmap.data.weekly_plan} />}
        {p.roadmap.data.phases.map((ph) => <div key={ph.number} className="card"><div className="flex items-center justify-between"><h4 className="font-semibold">Phase {ph.number}: {ph.name}</h4><Badge tone="iris">{ph.estimated_weeks} wk</Badge></div>
          <ul className="mt-2 list-disc pl-5 text-sm">{ph.tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
          <p className="mt-2 text-sm"><b>Output:</b> {ph.expected_output}</p><p className="text-xs text-ink-500">Tech: {ph.technologies.join(', ') || '—'} · Depends on: {ph.dependencies.join(', ') || 'none'}</p></div>)}</div>
        : <EmptyState title="No roadmap yet" text="Generate an 11-phase plan with tasks, outputs, technologies, time and dependencies." action={<button className="btn-signal" disabled={busy === 'rm'} onClick={() => act('rm', () => api.roadmap(p.id))}>{busy === 'rm' && <Spinner />} Generate roadmap</button>} />)}

      {tab === 'architecture' && (p.architecture ? <ArchitectureDiagram arch={p.architecture.data} /> : <EmptyState title="No architecture yet" text="Generate system, backend, database and AI-pipeline architecture." action={<button className="btn-signal" disabled={busy === 'ar'} onClick={() => act('ar', () => api.architecture(p.id))}>{busy === 'ar' && <Spinner />} Generate architecture</button>} />)}

      {tab === 'docs' && (p.documentation ? <div className="space-y-4">
        <div className="flex justify-end gap-2"><button className="btn-ghost" disabled={busy === 'doc'} onClick={() => act('doc', () => api.documentation(p.id))}>{busy === 'doc' && <Spinner />} Regenerate</button>
          <button className="btn-primary" onClick={() => api.download(p.id, 'md')}><Download size={16} /> Download report</button></div>
        {[['Abstract', 'abstract'], ['Introduction', 'introduction'], ['Existing system', 'existing_system'], ['Proposed system', 'proposed_system'], ['Methodology', 'methodology'], ['Conclusion', 'conclusion'], ['Resume description', 'resume_description'], ['Interview explanation', 'interview_explanation']].map(([l, k]) => p.documentation.data[k] && <div key={k} className="card"><h4 className="font-semibold">{l}</h4><p className="mt-1 whitespace-pre-line text-sm text-ink-700">{p.documentation.data[k]}</p></div>)}
        <div className="grid gap-4 md:grid-cols-2"><div className="card"><List title="PPT outline" items={p.documentation.data.ppt_outline} /></div><div className="card"><List title="References (verified sources only)" items={p.documentation.data.references?.length ? p.documentation.data.references : ['Run a novelty analysis to collect verified references.']} /></div></div>
        <div className="card"><h4 className="mb-2 font-semibold">Viva questions</h4>{p.documentation.data.viva_questions.map((q, i) => <p key={i} className="mb-2 text-sm"><b>{q.question}</b><br /><span className="text-ink-500">{q.answer}</span></p>)}</div>
        <div className="card"><h4 className="mb-2 font-semibold">GitHub README</h4><pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-ink-50 p-3 text-xs">{p.documentation.data.readme_md}</pre></div></div>
        : <EmptyState title="No documentation yet" text="Generate abstract, report sections, README, PPT outline, viva questions and interview explanation." action={<button className="btn-signal" disabled={busy === 'doc'} onClick={() => act('doc', () => api.documentation(p.id))}>{busy === 'doc' && <Spinner />} Generate documentation</button>} />)}
    </div>
  )
}
