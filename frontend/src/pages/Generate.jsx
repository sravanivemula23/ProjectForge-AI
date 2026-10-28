import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Sparkles } from 'lucide-react'
import { api } from '../services/api'
import { DOMAINS, LEVELS, toList } from '../utils/constants'
import { CardSkeletons, EmptyState, ErrorState, Field, Notice, PageHeader, Spinner } from '../components/ui'
import ProjectCard from '../components/ProjectCard'

export const DEFAULTS = { domain: '', difficulty: 'intermediate', team_type: 'individual', team_size: 1, time_weeks: 12, budget_usd: 50, budget_currency: 'USD',
  preferred_technologies: '', skills_to_improve: '', career_target: '', orientation: 'product', deployment_preference: 'cloud', hardware_available: '' }

export default function Generate() {
  const [f, setF] = useState(DEFAULTS); const [busy, setBusy] = useState(false); const [res, setRes] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.recommendations().then((r) => r.projects.length && setRes({ projects: r.projects })).catch(() => {}) }, [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const body = { ...f, preferred_technologies: toList(f.preferred_technologies), skills_to_improve: toList(f.skills_to_improve), hardware_available: toList(f.hardware_available),
        team_size: f.team_type === 'individual' ? 1 : f.team_size }
      setRes(await api.recommend(body)); toast.success('Ideas ready')
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  const toggle = async (fn, p, key) => { try { const r = await fn(p.id); setRes((s) => ({ ...s, projects: s.projects.map((q) => (q.id === p.id ? { ...q, [key]: r.favorite ?? r.saved } : q)) })) } catch (x) { toast.error(x.message) } }
  return (
    <div>
      <PageHeader title="Generate project ideas" subtitle="Tell us your constraints; we rank ideas for your profile with a transparent scoring formula." />
      <form onSubmit={submit} className="card mb-6 grid gap-4 md:grid-cols-3">
        <Field label="Domain" id="domain"><select id="domain" className="input" value={f.domain} onChange={set('domain')}><option value="">Any</option>{DOMAINS.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Difficulty" id="difficulty"><select id="difficulty" className="input" value={f.difficulty} onChange={set('difficulty')}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Project type" id="team_type"><select id="team_type" className="input" value={f.team_type} onChange={set('team_type')}><option value="individual">Individual</option><option value="team">Team</option></select></Field>
        {f.team_type === 'team' && <Field label="Team members" id="team_size"><input id="team_size" type="number" min={2} max={10} className="input" value={f.team_size} onChange={set('team_size')} /></Field>}
        <Field label="Available time (weeks)" id="time_weeks"><input id="time_weeks" type="number" min={1} max={104} className="input" value={f.time_weeks} onChange={set('time_weeks')} /></Field>
        <Field label={`Budget (${f.budget_currency === 'INR' ? '₹' : '$'})`} id="budget"><div className="flex gap-2"><input id="budget" type="number" min={0} className="input" value={f.budget_usd} onChange={set('budget_usd')} /><select aria-label="Currency" className="input w-24" value={f.budget_currency} onChange={set('budget_currency')}><option value="USD">USD</option><option value="INR">INR</option></select></div></Field>
        <Field label="Preferred technologies" id="tech" hint="Comma separated"><input id="tech" className="input" value={f.preferred_technologies} onChange={set('preferred_technologies')} placeholder="React, PyTorch" /></Field>
        <Field label="Skills to improve" id="improve" hint="Comma separated"><input id="improve" className="input" value={f.skills_to_improve} onChange={set('skills_to_improve')} placeholder="Docker, NLP" /></Field>
        <Field label="Career target" id="career"><input id="career" className="input" value={f.career_target} onChange={set('career_target')} placeholder="ML engineer" /></Field>
        <Field label="Orientation" id="orient"><select id="orient" className="input" value={f.orientation} onChange={set('orientation')}><option value="product">Product-oriented</option><option value="research">Research-oriented</option></select></Field>
        <Field label="Deployment preference" id="deploy"><select id="deploy" className="input" value={f.deployment_preference} onChange={set('deployment_preference')}>{['cloud', 'on-premise', 'mobile', 'edge/device', 'no deployment'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Hardware available" id="hw" hint="Comma separated"><input id="hw" className="input" value={f.hardware_available} onChange={set('hardware_available')} placeholder="Webcam, ESP32" /></Field>
        <div className="flex items-end md:col-span-3"><button className="btn-signal" disabled={busy}>{busy ? <Spinner /> : <Sparkles size={16} />} Generate recommendations</button></div>
      </form>
      {err && <ErrorState message={err} />}
      {busy && <CardSkeletons n={6} />}
      {!busy && res && <>
        {res.notice && <div className="mb-4"><Notice tone={res.origin === 'llm' ? 'info' : 'warn'}>{res.notice}</Notice></div>}
        <p className="mb-3 text-xs text-ink-500">* Novelty shown for new ideas is an unverified prior. Open a project and run the novelty analysis to verify it against GitHub and research papers.</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{res.projects.map((p) => <ProjectCard key={p.id} p={p} onFavorite={(q) => toggle(api.favorite, q, 'is_favorite')} onSave={(q) => toggle(q.is_saved ? api.unsave : api.save, q, 'is_saved')} />)}</div>
      </>}
      {!busy && !res && !err && <EmptyState title="No ideas yet" text="Fill in your preferences above and generate your first set of ranked recommendations." />}
    </div>
  )
}
