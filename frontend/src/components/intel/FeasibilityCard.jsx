import { Badge } from '../ui'

const Row = ({ k, children }) => <div className="flex flex-col gap-0.5 border-b border-ink-100 py-2 sm:flex-row sm:gap-4"><dt className="w-44 shrink-0 text-sm font-medium text-ink-500">{k}</dt><dd className="text-sm">{children}</dd></div>
export default function FeasibilityCard({ f }) {
  if (!f) return null
  return (
    <section className="card" aria-labelledby="f-h">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 id="f-h" className="text-lg font-bold">Feasibility analysis</h3><Badge tone={f.difficulty === 'Hard' ? 'amber' : f.difficulty === 'Easy' ? 'signal' : 'iris'}>Difficulty: {f.difficulty}</Badge></div>
      <dl>
        <Row k="Feasibility score">{f.score}/100 <span className="text-xs text-ink-500">· {f.explanation}</span></Row>
        <Row k="Estimated time">{f.estimatedTime.label} <span className="text-xs text-ink-500">({f.estimatedTime.basis})</span></Row>
        <Row k="Required skills">{f.requiredSkills.length ? f.requiredSkills.join(', ') : 'Information unavailable'}{f.skillsToLearn?.length > 0 && <span className="block text-xs text-amber-800">You may need to learn: {f.skillsToLearn.join(', ')}</span>}</Row>
        <Row k="GPU / hardware">GPU: {f.hardware.gpu}{f.hardware.required.length > 0 && <span className="block text-xs">Hardware: {f.hardware.required.join(', ')}</span>}</Row>
        <Row k="Dataset">{f.dataset.availability}{f.dataset.references.map((d, i) => <span key={i} className="mt-1 block text-xs text-ink-500">“{d.text}” - {d.paper}</span>)}</Row>
        <Row k="API dependencies">{f.apiDependencies.length ? f.apiDependencies.join('; ') : 'None identified'}</Row>
        <Row k="Cloud">{f.cloud.join(', ')}</Row>
        <Row k="Estimated cost">{f.cost.level} · ≈ ${f.cost.usd} / ₹{f.cost.inr} <span className="text-xs text-ink-500">{f.cost.note}</span></Row>
        <Row k="Deployment difficulty">{f.deploymentDifficulty}</Row>
      </dl>
    </section>
  )
}
