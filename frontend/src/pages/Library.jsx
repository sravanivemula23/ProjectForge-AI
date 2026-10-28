import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'
import { api } from '../services/api'
import { DOMAINS } from '../utils/constants'
import { CardSkeletons, EmptyState, ErrorState, PageHeader } from '../components/ui'
import ProjectCard from '../components/ProjectCard'

const SCOPES = [['all', 'All'], ['saved', 'Saved'], ['favorites', 'Favorites'], ['analyzed', 'Analyzed'], ['recommended', 'Recommended']]

export default function Library() {
  const [scope, setScope] = useState('all'); const [q, setQ] = useState(''); const [domain, setDomain] = useState('')
  const [items, setItems] = useState(null); const [err, setErr] = useState(''); const [sel, setSel] = useState([])
  const load = useCallback(async () => { try { setErr(''); setItems((await api.listProjects({ scope, q, domain })).projects) } catch (x) { setErr(x.message) } }, [scope, q, domain])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
  const patch = (p, k, v) => setItems((l) => l.map((x) => (x.id === p.id ? { ...x, [k]: v } : x)))
  return (
    <div>
      <PageHeader title="My projects" subtitle="Everything you've generated, analyzed and saved." actions={sel.length >= 2 && <Link className="btn-signal" to={`/compare?ids=${sel.join(',')}`}>Compare {sel.length}</Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-white p-1">{SCOPES.map(([k, l]) => <button key={k} onClick={() => setScope(k)} className={`rounded-md px-3 py-1 text-sm ${scope === k ? 'bg-ink text-white' : ''}`}>{l}</button>)}</div>
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 text-ink-300" size={16} /><input aria-label="Search projects" className="input pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select aria-label="Filter by domain" className="input w-auto" value={domain} onChange={(e) => setDomain(e.target.value)}><option value="">All domains</option>{DOMAINS.map((d) => <option key={d}>{d}</option>)}</select>
      </div>
      {err && <ErrorState message={err} onRetry={load} />}
      {!items && !err && <CardSkeletons />}
      {items && !items.length && <EmptyState title="Nothing here yet" text="Generate ideas or analyze your own to build your library." action={<Link className="btn-signal" to="/generate">Generate ideas</Link>} />}
      {items && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((p) => (
        <ProjectCard key={p.id} p={p} selectable selected={sel.includes(p.id)} onSelect={(x) => setSel((s) => (s.includes(x.id) ? s.filter((i) => i !== x.id) : s.length < 3 ? [...s, x.id] : (toast('Compare up to 3 projects'), s)))}
          onFavorite={async (x) => { const r = await api.favorite(x.id); patch(x, 'is_favorite', r.favorite) }} onSave={async (x) => { const r = await (x.is_saved ? api.unsave : api.save)(x.id); patch(x, 'is_saved', r.saved) }} />))}</div>}
    </div>
  )
}
