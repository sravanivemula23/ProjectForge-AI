import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../services/api'
import { CardSkeletons, ErrorState, PageHeader, Badge } from '../components/ui'

const Chart = ({ title, data, x, y }) => (
  <div className="card h-72"><h3 className="mb-2 font-semibold">{title}</h3>{data.length ? <ResponsiveContainer width="100%" height="85%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={x} fontSize={10} interval={0} angle={-20} height={50} textAnchor="end" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey={y} fill="#3B4CCA" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-ink-500">No data yet.</p>}</div>
)
const UsageTable = ({ title, rows }) => (
  <div className="card"><h3 className="mb-2 font-semibold">{title}</h3>{rows.length ? <table className="w-full text-sm"><thead><tr className="text-left text-ink-500"><th>Name</th><th>Calls</th><th>OK</th><th>Avg ms</th></tr></thead><tbody>{rows.map((r) => <tr key={r.name} className="border-t border-ink-100"><td>{r.name}</td><td>{r.calls}</td><td>{r.success}</td><td>{r.avg_latency_ms}</td></tr>)}</tbody></table> : <p className="text-sm text-ink-500">No calls recorded.</p>}</div>
)

export default function Admin() {
  const [s, setS] = useState(null); const [users, setUsers] = useState([]); const [logs, setLogs] = useState([]); const [err, setErr] = useState('')
  const load = () => Promise.all([api.admin.stats(), api.admin.users(), api.admin.logs()]).then(([a, b, c]) => { setS(a); setUsers(b.users); setLogs(c.logs) }).catch((x) => setErr(x.message))
  useEffect(() => { load() }, [])
  const update = async (id, body) => { try { await api.admin.updateUser(id, body); toast.success('Updated'); load() } catch (x) { toast.error(x.message) } }
  if (err) return <ErrorState message={err} onRetry={load} />
  if (!s) return <CardSkeletons />
  return (
    <div>
      <PageHeader title="Admin dashboard" subtitle="Platform health, usage and users" />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">{[['Users', s.users.total], ['Active', s.users.active], ['Admins', s.users.admins], ['Projects', s.projects_total]].map(([k, v]) => <div key={k} className="card"><div className="text-sm text-ink-500">{k}</div><div className="text-2xl font-bold">{v}</div></div>)}</div>
      <div className="mb-6 grid gap-4 lg:grid-cols-3"><Chart title="Most searched domains" data={s.top_domains} x="domain" y="count" /><Chart title="Project categories" data={s.categories} x="domain" y="count" /><Chart title="Most saved projects" data={s.popular_projects.map((p) => ({ ...p, title: p.title.slice(0, 22) }))} x="title" y="saves" /></div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2"><UsageTable title="AI usage" rows={s.ai_usage} /><UsageTable title="External API usage" rows={s.api_usage} /></div>
      <div className="card mb-6 overflow-x-auto"><h3 className="mb-2 font-semibold">User management</h3><table className="w-full text-sm"><thead><tr className="text-left text-ink-500"><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>{users.map((u) => (
        <tr key={u.id} className="border-t border-ink-100"><td className="py-2">{u.name}</td><td>{u.email}</td><td><Badge tone={u.role === 'admin' ? 'iris' : 'neutral'}>{u.role}</Badge></td><td>{u.is_active ? 'active' : 'disabled'}</td>
          <td className="space-x-2 text-right"><button className="text-iris" onClick={() => update(u.id, { is_active: !u.is_active })}>{u.is_active ? 'Disable' : 'Enable'}</button><button className="text-iris" onClick={() => update(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })}>Toggle admin</button></td></tr>))}</tbody></table></div>
      <div className="card"><h3 className="mb-2 font-semibold">Error logs</h3>{logs.length ? <ul className="space-y-1 text-xs">{logs.map((l) => <li key={l.id}><Badge tone="amber">{l.kind}</Badge> <b>{l.name}</b> - {l.detail} <span className="text-ink-300">{new Date(l.created_at).toLocaleString()}</span></li>)}</ul> : <p className="text-sm text-ink-500">No errors recorded.</p>}</div>
    </div>
  )
}
