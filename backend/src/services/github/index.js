import crypto from 'node:crypto'
import { env } from '../../config/env.js'
import { GitHubRepositoryCache } from '../../models/index.js'
import { buildGithubQueries } from './queries.js'
import { prepareProject, scoreRepository } from './relevance.js'
import { searchRepositories, GitHubError } from './client.js'
import { projectContext } from '../intelligence/text.js'
import { logUsage } from '../../utils/usage.js'

export const MESSAGES = {
  unavailable: 'GitHub projects could not be loaded right now.', rate_limited: 'GitHub is limiting requests right now. Please try again in a few minutes (adding GITHUB_TOKEN raises the limit).',
  empty: 'No related GitHub repositories were found for this idea.', partial: 'Some GitHub searches failed, so these results may be incomplete.',
}
const hash = (q) => crypto.createHash('sha256').update(q.toLowerCase().trim()).digest('hex')
const inflight = new Map() // request de-duplication: concurrent identical searches share one upstream call
const repoKey = (r) => r.fullName.toLowerCase()

/** Cached single-query search. `searcher` is injectable for tests. */
export async function cachedSearch(query, { refresh = false, searcher = searchRepositories, userId = null } = {}) {
  const key = hash(query)
  if (!refresh) {
    const hit = await GitHubRepositoryCache.findOne({ query_hash: key }).lean().catch(() => null)
    if (hit && hit.expires_at > new Date()) return { items: hit.items, totalCount: hit.total_count, cached: true }
  }
  if (inflight.has(key)) return inflight.get(key)
  const p = (async () => {
    const start = performance.now()
    try {
      const out = await searcher(query)
      await logUsage('search', 'github', true, performance.now() - start, '', userId)
      const ttl = (out.items.length ? env.githubCacheTtlHours : Math.min(1, env.githubCacheTtlHours)) * 3600_000
      await GitHubRepositoryCache.updateOne({ query_hash: key }, { $set: { query, items: out.items, total_count: out.totalCount, fetched_at: new Date(), expires_at: new Date(Date.now() + ttl) } }, { upsert: true }).catch(() => {})
      return { ...out, cached: false }
    } catch (err) {
      await logUsage('search', 'github', false, performance.now() - start, err.message, userId)
      throw err
    } finally { inflight.delete(key) }
  })()
  inflight.set(key, p)
  return p
}

export function summarizeGithub(repos, retrieved) {
  const sim = repos.filter((r) => r.similarity >= 50)
  const closest = repos.length ? [...repos].sort((a, b) => b.similarity - a.similarity)[0] : null
  const langs = {}
  for (const r of repos) if (r.language) langs[r.language] = (langs[r.language] || 0) + 1
  return {
    retrieved, similarCount: sim.length, activeSimilarCount: sim.filter((r) => r.activity === 'active' || r.activity === 'maintained').length,
    archivedCount: repos.filter((r) => r.archived).length, closest: closest ? { fullName: closest.fullName, url: closest.url, similarity: closest.similarity } : null,
    topLanguages: Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([language, count]) => ({ language, count })),
  }
}

/** Multi-strategy GitHub intelligence: queries -> cached searches -> dedupe -> relevance ranking. Never throws for upstream failures. */
export async function getGithubIntelligence(project, { limit = 8, refresh = false, searcher, userId = null, now = Date.now() } = {}) {
  const c = project.title && project.data !== undefined && !project.technologies ? projectContext(project) : project
  const queries = buildGithubQueries(c)
  const settled = await Promise.allSettled(queries.map((q) => cachedSearch(q.q, { refresh, searcher, userId })))
  const qStatus = queries.map((q, i) => {
    const s = settled[i]
    return s.status === 'fulfilled' ? { ...q, ok: true, count: s.value.items.length, cached: s.value.cached } : { ...q, ok: false, count: 0, error: s.reason instanceof GitHubError ? s.reason.kind : 'unknown' }
  })
  const failed = qStatus.filter((q) => !q.ok)
  const prep = prepareProject(c)
  const map = new Map()
  settled.forEach((s, i) => {
    if (s.status !== 'fulfilled') return
    for (const repo of s.value.items) {
      const k = repoKey(repo)
      if (map.has(k)) map.get(k).foundBy.push(queries[i].strategy)
      else map.set(k, { ...repo, foundBy: [queries[i].strategy] })
    }
  })
  const scored = [...map.values()].map((r) => ({ ...r, ...scoreRepository(prep, r, now) }))
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore || b.stars - a.stars || a.fullName.localeCompare(b.fullName))
  const top = scored.slice(0, Math.max(1, Math.min(limit, 20)))
  let status = 'ok', message = null
  if (failed.length === queries.length) { status = failed.every((f) => f.error === 'rate_limit') ? 'rate_limited' : 'unavailable'; message = MESSAGES[status] }
  else if (failed.length) { status = 'partial'; message = MESSAGES.partial }
  else if (!scored.length) { status = 'empty'; message = MESSAGES.empty }
  return {
    status, message, retryable: status === 'unavailable' || status === 'rate_limited' || status === 'partial', repositories: top, totalAvailable: scored.length,
    queries: qStatus, cached: qStatus.every((q) => q.ok && q.cached), summary: summarizeGithub(scored, map.size), tokenConfigured: !!env.githubToken, generatedAt: new Date().toISOString(),
  }
}
