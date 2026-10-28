export default function WeeklyPlan({ plan }) {
  if (!plan) return null
  return (
    <section className="mt-6" aria-labelledby="wp-h">
      <h3 id="wp-h" className="mb-1 text-lg font-bold">Week-by-week plan</h3>
      <p className="mb-3 text-xs text-ink-500">{plan.totalWeeks} weeks for a team of {plan.teamSize}. {plan.notes?.join(' ')}</p>
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">{plan.weeks.map((w) => (
        <li key={w.week} className="card !p-4"><div className="mb-1 text-xs font-bold uppercase tracking-wide text-signal-dark">Week {w.week}</div>
          <div className="font-semibold">{w.focus.join(' + ')}</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink-700">{[...new Set(w.tasks)].slice(0, 4).map((t, i) => <li key={i}>{t}</li>)}</ul>
          {w.deliverables.length > 0 && <p className="mt-1 text-xs text-ink-500">Deliverable: {w.deliverables.join('; ')}</p>}</li>))}</ol>
    </section>
  )
}
