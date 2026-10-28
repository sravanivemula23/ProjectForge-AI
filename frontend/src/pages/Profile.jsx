import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'
import { DOMAINS, LEVELS, toList } from '../utils/constants'
import { Field, PageHeader, Spinner } from '../components/ui'

const LISTS = [['skills', 'Skills'], ['programming_languages', 'Programming languages'], ['frameworks', 'Frameworks'], ['ai_ml_knowledge', 'AI/ML knowledge'],
  ['database_knowledge', 'Database knowledge'], ['cloud_knowledge', 'Cloud knowledge'], ['interests', 'Interests'], ['research_interest', 'Research interests']]

export default function Profile() {
  const { user, refresh } = useAuth()
  const [p, setP] = useState(null); const [busy, setBusy] = useState(false)
  useEffect(() => { if (user) setP({ ...user.profile, ...Object.fromEntries(LISTS.map(([k]) => [k, (user.profile[k] || []).join(', ')])) }) }, [user])
  if (!p) return <Spinner />
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value })
  const toggleDomain = (d) => setP({ ...p, preferred_domains: p.preferred_domains.includes(d) ? p.preferred_domains.filter((x) => x !== d) : [...p.preferred_domains, d] })
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api.saveProfile({ ...p, ...Object.fromEntries(LISTS.map(([k]) => [k, toList(p[k])])) }); await refresh(); toast.success('Profile saved') } catch (x) { toast.error(x.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={save} className="mx-auto max-w-3xl">
      <PageHeader title="Your profile" subtitle={`Profile ${user.profile_completion}% complete - richer profiles give better recommendations.`} />
      <div className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Education" id="edu"><input id="edu" className="input" value={p.education} onChange={set('education')} placeholder="B.Tech" /></Field>
          <Field label="Branch" id="branch"><input id="branch" className="input" value={p.branch} onChange={set('branch')} placeholder="Computer Science" /></Field>
          <Field label="Year" id="year"><input id="year" className="input" value={p.year} onChange={set('year')} placeholder="Final year" /></Field>
        </div>
        {LISTS.map(([k, label]) => <Field key={k} label={label} id={k} hint="Comma separated"><input id={k} className="input" value={p[k]} onChange={set(k)} /></Field>)}
        <fieldset><legend className="label">Preferred domains</legend><div className="flex flex-wrap gap-2">{DOMAINS.map((d) => (
          <button type="button" key={d} aria-pressed={p.preferred_domains.includes(d)} onClick={() => toggleDomain(d)}
            className={`rounded-full border px-3 py-1 text-sm ${p.preferred_domains.includes(d) ? 'border-signal bg-signal-light text-signal-dark' : 'border-ink-100 bg-white'}`}>{d}</button>))}</div></fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Career goal" id="goal"><input id="goal" className="input" value={p.career_goal} onChange={set('career_goal')} placeholder="ML engineer, full-stack developer…" /></Field>
          <Field label="Academic requirement" id="acad"><select id="acad" className="input" value={p.academic_requirement || ''} onChange={set('academic_requirement')}><option value="">Not specified</option>{['placement', 'academic', 'placement + academic', 'research paper', 'hackathon', 'portfolio'].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Experience level" id="exp"><select id="exp" className="input" value={p.experience_level} onChange={set('experience_level')}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></Field>
        </div>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Save profile</button>
      </div>
    </form>
  )
}
