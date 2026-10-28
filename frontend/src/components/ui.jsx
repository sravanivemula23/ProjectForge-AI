import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'

export const Spinner = ({ className = '' }) => <Loader2 className={`animate-spin ${className}`} size={16} aria-label="Loading" />
export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-lg bg-ink-100 ${className}`} aria-hidden="true" />
export const CardSkeletons = ({ n = 3 }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading content">
    {Array.from({ length: n }).map((_, i) => <div key={i} className="card space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-16 w-full" /></div>)}
  </div>
)
export const EmptyState = ({ title, text, action }) => (
  <div className="card flex flex-col items-center py-12 text-center">
    <Inbox className="mb-3 text-ink-300" size={32} />
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-ink-500">{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
)
export const ErrorState = ({ message, onRetry }) => (
  <div role="alert" className="card flex items-start gap-3 border-red-200 bg-red-50">
    <AlertTriangle className="mt-0.5 text-red-600" size={18} />
    <div className="flex-1 text-sm text-red-800">{message}</div>
    {onRetry && <button className="btn-ghost" onClick={onRetry}>Retry</button>}
  </div>
)
export const Badge = ({ children, tone = 'neutral' }) => {
  const tones = { neutral: 'bg-ink-100 text-ink-700', signal: 'bg-signal-light text-signal-dark', iris: 'bg-iris-light text-iris', amber: 'bg-amber-100 text-amber-800' }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}
export const Field = ({ label, hint, children, id }) => (
  <div><label htmlFor={id} className="label">{label}</label>{children}{hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}</div>
)
export const Notice = ({ children, tone = 'info' }) => (
  <div className={`rounded-lg border px-3 py-2 text-sm ${tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-iris/20 bg-iris-light text-ink-700'}`}>{children}</div>
)
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-bold md:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}</div>
    <div className="flex gap-2">{actions}</div>
  </div>
)
