import { ArrowDown } from 'lucide-react'

export default function ArchitectureDiagram({ arch }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-700">{arch.system_overview}</p>
      <div className="flex flex-col items-stretch gap-1">
        {arch.layers.map((l, i) => (
          <div key={l.name}>
            <div className="rounded-xl border border-ink-100 bg-white p-3">
              <div className="mb-2 text-sm font-semibold">{l.name}</div>
              <div className="flex flex-wrap gap-2">{l.components.map((c) => <span key={c} className="rounded-md bg-iris-light px-2 py-1 text-xs text-iris">{c}</span>)}</div>
            </div>
            {i < arch.layers.length - 1 && <ArrowDown className="mx-auto my-1 text-ink-300" size={16} />}
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card"><h4 className="mb-2 font-semibold">AI pipeline</h4><ol className="list-decimal space-y-1 pl-5 text-sm">{arch.ai_pipeline.map((s) => <li key={s}>{s}</li>)}</ol></div>
        <div className="card"><h4 className="mb-2 font-semibold">API flow</h4><ul className="space-y-1 text-sm">{arch.api_flow.map((f, i) => <li key={i}><b>{f.from}</b> → <b>{f.to}</b>: {f.action}</li>)}</ul></div>
        <div className="card md:col-span-2"><h4 className="mb-2 font-semibold">Database schema</h4>
          <div className="grid gap-3 sm:grid-cols-3">{arch.database_tables.map((t) => (
            <div key={t.name} className="rounded-lg bg-ink-50 p-3 text-xs"><div className="mb-1 font-mono font-semibold">{t.name}</div>{t.columns.map((c) => <div key={c} className="font-mono text-ink-500">{c}</div>)}</div>))}</div></div>
      </div>
    </div>
  )
}
