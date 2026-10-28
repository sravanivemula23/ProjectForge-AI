import { Heart, Bookmark, FlaskConical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from './ui'
import ScoreRing from './ScoreRing'

export default function ProjectCard({ p, onFavorite, onSave, selectable, selected, onSelect }) {
  const s = p.scores
  return (
    <article className={`card flex flex-col gap-3 ${selected ? 'ring-2 ring-iris' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap gap-1.5">
            {p.rank && <Badge tone="iris">#{p.rank}</Badge>}<Badge tone="signal">{p.domain}</Badge><Badge>{p.difficulty}</Badge>
            {p.is_demo && <Badge tone="amber">demo template</Badge>}{p.version > 1 && <Badge tone="iris">v{p.version}</Badge>}{p.progress && p.progress !== 'idea' && <Badge tone="signal">{p.progress}</Badge>}
          </div>
          <Link to={`/projects/${p.id}`} className="font-display text-lg font-bold leading-snug hover:text-iris">{p.title}</Link>
        </div>
        {s && <ScoreRing value={s.overall} label="Overall" size={64} />}
      </div>
      <p className="line-clamp-3 text-sm text-ink-500">{p.short_description}</p>
      {s && <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        {[['Novelty', s.scores.novelty + (s.novelty_verified ? '' : '*')], ['Feasible', s.scores.feasibility], ['Career', s.scores.career_relevance]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-ink-50 py-1.5"><dt className="text-ink-500">{k}</dt><dd className="font-semibold">{v}</dd></div>))}
      </dl>}
      <div className="mt-auto flex items-center justify-between pt-1">
        <div className="flex gap-1">
          {onFavorite && <button aria-label={p.is_favorite ? 'Remove favorite' : 'Add favorite'} className="btn-ghost !px-2" onClick={() => onFavorite(p)}><Heart size={16} className={p.is_favorite ? 'fill-red-500 text-red-500' : ''} /></button>}
          {onSave && <button aria-label={p.is_saved ? 'Unsave' : 'Save'} className="btn-ghost !px-2" onClick={() => onSave(p)}><Bookmark size={16} className={p.is_saved ? 'fill-iris text-iris' : ''} /></button>}
          {selectable && <label className="btn-ghost cursor-pointer"><input type="checkbox" checked={!!selected} onChange={() => onSelect(p)} /> Compare</label>}
        </div>
        <Link to={`/projects/${p.id}`} className="btn-primary"><FlaskConical size={14} /> Analyze</Link>
      </div>
    </article>
  )
}
