import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../services/api'
import { CardSkeletons, EmptyState, ErrorState, PageHeader, Badge } from '../components/ui'

const COLORS = ['#0F9D8A', '#3B4CCA', '#E8A33D']
const METRICS = [['novelty', 'Novelty'], ['difficulty', 'Difficulty'], ['career_value', 'Career value'], ['research_potential', 'Research'], ['market_potential', 'Market'], ['ai_complexity', 'AI complexity'], ['deployment_complexity', 'Deployment']]
const EXTRA = [['Industry relevance', 'industry'], ['Portfolio value', 'portfolio_value'], ['GitHub similarity', 'github_similarity'], ['ProjectForge score', 'projectforge_score'], ['Cost level', 'cost_level']]

export default function Compare() {
  const [qs] = useSearchParams(); const [all, setAll] = useState(null); const [ids, setIds] = useState((qs.get('ids') || '').split(',').filter(Boolean))
  const [rows, setRows] = useState(null); const [rec, setRec] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.listProjects({}).then((r) => setAll(r.projects)).catch((x) => setErr(x.message)) }, [])
  useEffect(() => { if (ids.length >= 2) api.compare(ids).then((r) => { setRows(r.projects); setRec(r.recommended) }).catch((x) => setErr(x.message)); else setRows(null) }, [ids])
  const toggle = (id) => setIds((s) => (s.includes(id) ? s.filter((i) => i !== id) : s.length < 3 ? [...s, id] : s))
  const radar = rows && METRICS.map(([k, l]) => ({ metric: l, ...Object.fromEntries(rows.map((r, i) => [`p${i}`, r[k] ?? 0])) }))
  return (
    <div>
      <PageHeader title="Compare projects" subtitle="Pick 2-3 projects to compare side by side." />
      {err && <ErrorState message={err} />}
      {!all ? <CardSkeletons n={2} /> : !all.length ? <EmptyState title="No projects to compare" text="Generate some ideas first." /> : (
        <div className="card mb-6"><div className="flex flex-wrap gap-2">{all.map((p) => <button key={p.id} aria-pressed={ids.includes(p.id)} onClick={() => toggle(p.id)} className={`rounded-lg border px-3 py-1.5 text-left text-sm ${ids.includes(p.id) ? 'border-iris bg-iris-light' : 'border-ink-100'}`}>{p.title.slice(0, 48)}</button>)}</div></div>)}
      {ids.length < 2 && all?.length > 0 && <EmptyState title="Select at least two projects" text="Choose from the list above." />}
      {rows && <div className="space-y-6">
        {rec && <section className="card border-2 border-signal bg-signal-light" aria-label="Recommended project"><div className="text-xs font-bold uppercase tracking-wide text-signal-dark">Recommended project</div><h3 className="text-lg font-bold">{rec.title}</h3><p className="text-sm text-ink-700">{rec.reason}</p></section>}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card h-80"><ResponsiveContainer><RadarChart data={radar}><PolarGrid /><PolarAngleAxis dataKey="metric" fontSize={11} />{rows.map((r, i) => <Radar key={r.id} name={r.title.slice(0, 28)} dataKey={`p${i}`} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />)}<Legend /><Tooltip /></RadarChart></ResponsiveContainer></div>
          <div className="card h-80"><ResponsiveContainer><BarChart data={METRICS.map(([k, l]) => ({ metric: l, ...Object.fromEntries(rows.map((r, i) => [`p${i}`, r[k] ?? 0])) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="metric" fontSize={10} /><YAxis domain={[0, 100]} /><Tooltip />{rows.map((r, i) => <Bar key={r.id} name={r.title.slice(0, 28)} dataKey={`p${i}`} fill={COLORS[i]} />)}</BarChart></ResponsiveContainer></div>
        </div>
        <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2" />{rows.map((r, i) => <th key={r.id} className="p-2" style={{ color: COLORS[i] }}>{r.title}</th>)}</tr></thead><tbody>
          {[['Overall score', 'overall'], ['Cost (USD)', 'cost_usd'], ['Development time (weeks)', 'time_weeks']].concat(METRICS.map(([k, l]) => [l, k])).concat(EXTRA).map(([l, k]) => <tr key={k} className="border-t border-ink-100"><td className="p-2 font-medium">{l}</td>{rows.map((r) => <td key={r.id} className="p-2">{r[k] ?? '—'}{k === 'novelty' && !r.novelty_verified && <span className="text-xs text-amber-700"> (est.)</span>}</td>)}</tr>)}
          <tr className="border-t border-ink-100"><td className="p-2 font-medium">Required skills</td>{rows.map((r) => <td key={r.id} className="p-2"><div className="flex flex-wrap gap-1">{r.required_skills.map((s) => <Badge key={s}>{s}</Badge>)}</div></td>)}</tr></tbody></table></div></div>}
    </div>
  )
}
