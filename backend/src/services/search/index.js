import { PROVIDERS } from './providers.js'
import { SearchError } from './http.js'
import { env } from '../../config/env.js'
import { timed } from '../../utils/usage.js'

/** Query every provider in parallel. Failures are reported per provider in `status`; nothing is fabricated. */
export async function runSearch(queries, { kinds = ['repo', 'paper'], limit = 8, userId = null } = {}) {
  const jobs = Object.entries(PROVIDERS).filter(([, [kind]]) => kinds.includes(kind)).flatMap(([name, [, fn]]) => queries.slice(0, name === 'semantic_scholar' && !env.semanticScholarKey ? 1 : 2).map((q) => ({ name, fn, q })))
  const status = Object.fromEntries([...new Set(jobs.map((j) => j.name))].map((n) => [n, { ok: false, count: 0, error: null }]))
  const settled = await Promise.allSettled(jobs.map((j) => timed('search', j.name, userId, () => j.fn(j.q, limit))))
  const items = []
  settled.forEach((s, i) => {
    const st = status[jobs[i].name]
    if (s.status === 'fulfilled') { st.ok = true; st.count += s.value.length; items.push(...s.value) }
    else st.error = s.reason instanceof SearchError ? s.reason.message : `${s.reason?.name}: ${s.reason?.message}`
  })
  const seen = new Set(), unique = []
  for (const it of items) {
    const key = (it.url || it.title).toLowerCase().replace(/\/$/, '')
    if (key && !seen.has(key) && it.title) { seen.add(key); unique.push(it) }
  }
  return { items: unique, status }
}
