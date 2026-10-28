import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FlaskConical } from 'lucide-react'
import { api } from '../services/api'
import { DOMAINS } from '../utils/constants'
import { Field, Notice, PageHeader, Spinner } from '../components/ui'

export default function Analyze() {
  const nav = useNavigate()
  const [idea, setIdea] = useState(''); const [domain, setDomain] = useState(''); const [busy, setBusy] = useState(false)
  const run = async (e) => {
    e.preventDefault(); setBusy(true)
    try { const r = await api.analyze({ idea_text: idea, domain }); toast.success('Analysis complete'); nav(`/projects/${r.project.id}?tab=novelty`) } catch (x) { toast.error(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Analyze your own idea" subtitle="We search GitHub and research-paper sources, then estimate how similar and how novel your idea is." />
      <form onSubmit={run} className="card space-y-4">
        <Field label="Describe your idea" id="idea" hint="Example: AI-based bone fracture detection using Vision Transformer (10+ characters)">
          <textarea id="idea" required minLength={10} maxLength={3000} rows={5} className="input" value={idea} onChange={(e) => setIdea(e.target.value)} /></Field>
        <Field label="Domain (optional)" id="dom"><select id="dom" className="input" value={domain} onChange={(e) => setDomain(e.target.value)}><option value="">Auto</option>{DOMAINS.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Notice>Results are estimates from the sources that could be retrieved. We never claim an idea is completely unique.</Notice>
        <button className="btn-signal" disabled={busy || idea.trim().length < 10}>{busy ? <Spinner /> : <FlaskConical size={16} />} {busy ? 'Searching sources… this can take ~20s' : 'Run novelty analysis'}</button>
      </form>
    </div>
  )
}
