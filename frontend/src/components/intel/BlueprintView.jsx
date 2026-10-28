const L = ({ items }) => <ul className="list-disc space-y-0.5 pl-5">{items.map((x, i) => <li key={i}>{typeof x === 'string' ? x : `${x.method} ${x.path} - ${x.purpose}`}</li>)}</ul>
export const SECTIONS = (b) => [
  ['Project title', <p className="font-semibold">{b.title}</p>], ['One-line idea', <p>{b.one_line_idea}</p>], ['Problem statement', <p>{b.problem_statement}</p>], ['Proposed solution', <p>{b.proposed_solution}</p>], ['Objectives', <L items={b.objectives} />], ['Target users', <L items={b.target_users} />],
  ['Key features', <L items={b.key_features} />], ['Unique features', <L items={b.unique_features} />], ['Existing-system limitations', <L items={b.existing_system_limitations} />], ['Proposed-system advantages', <L items={b.proposed_system_advantages} />],
  ['Architecture', <><p>{b.architecture.overview}</p><ul className="mt-1 space-y-0.5">{b.architecture.layers.map((l) => <li key={l.name}><b>{l.name}:</b> {l.components.join(', ')}</li>)}</ul></>],
  ['Technology stack', <ul className="space-y-0.5">{Object.entries(b.technology_stack).map(([k, v]) => <li key={k}><b className="capitalize">{k.replace('_', '/')}:</b> {v.join(', ')}</li>)}</ul>],
  ['Frontend', <L items={b.frontend} />], ['Backend', <L items={b.backend} />], ['Database', <L items={b.database} />], ['AI/ML components', <L items={b.ai_ml_components} />], ['APIs', <L items={b.apis} />],
  ['Dataset requirements', <L items={b.dataset_requirements} />], ['Security', <L items={b.security} />], ['Testing', <L items={b.testing} />], ['Deployment', <L items={b.deployment} />], ['Future enhancements', <L items={b.future_enhancements} />],
]
export default function BlueprintView({ blueprint }) {
  if (!blueprint) return null
  return (
    <section className="space-y-2" aria-labelledby="bp-h">
      <h3 id="bp-h" className="text-lg font-bold">Project blueprint</h3>
      {blueprint.origin && <p className="text-xs text-ink-500">{blueprint.origin === 'llm' ? 'AI-generated blueprint (validated)' : 'Template-based blueprint built from your project and the evidence collected'}; AI suggestions are not verified facts.</p>}
      {SECTIONS(blueprint).map(([title, body], i) => <details key={title} open={i < 3} className="card !p-4"><summary className="cursor-pointer font-semibold">{i + 1}. {title}</summary><div className="mt-2 text-sm text-ink-700">{body}</div></details>)}
    </section>
  )
}
