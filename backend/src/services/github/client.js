import { env } from '../../config/env.js'
import { describeNetworkError } from '../search/http.js'

export class GitHubError extends Error {
  constructor(kind, message, extra = {}) { super(message); this.kind = kind; Object.assign(this, extra) } // kind: rate_limit | network | invalid_response | http | invalid_query
}

let cooldownUntil = 0 // after a rate-limit response we stop calling GitHub until the reset time (max 15 min)
export const resetGithubCooldown = () => { cooldownUntil = 0 }

/** Only real https://github.com/... links are ever returned to the UI. */
export function safeRepoUrl(url) {
  try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'github.com' && /^\/[^/]+\/[^/]+\/?$/.test(u.pathname) ? `https://github.com${u.pathname.replace(/\/$/, '')}` : null } catch { return null }
}

export function normalizeRepo(it) {
  if (!it || typeof it !== 'object' || typeof it.full_name !== 'string') return null
  const url = safeRepoUrl(it.html_url)
  if (!url) return null
  return {
    name: String(it.name || it.full_name.split('/')[1] || ''), fullName: it.full_name, owner: String(it.owner?.login || it.full_name.split('/')[0] || ''),
    description: typeof it.description === 'string' ? it.description : '', url, stars: Number(it.stargazers_count) || 0, forks: Number(it.forks_count) || 0,
    watchers: Number(it.watchers_count) || 0, language: it.language || null, topics: Array.isArray(it.topics) ? it.topics.map(String) : [],
    createdAt: it.created_at || null, updatedAt: it.updated_at || null, pushedAt: it.pushed_at || null, openIssues: Number(it.open_issues_count) || 0,
    license: it.license?.spdx_id && it.license.spdx_id !== 'NOASSERTION' ? it.license.spdx_id : it.license?.name || null, archived: !!it.archived, defaultBranch: it.default_branch || null,
  }
}

/** GET /search/repositories (backend only; the token never reaches the browser). Works without GITHUB_TOKEN. */
export async function searchRepositories(query, { perPage = 15, fetchImpl = fetch } = {}) {
  if (Date.now() < cooldownUntil) throw new GitHubError('rate_limit', 'GitHub rate limit reached; retry later', { resetAt: cooldownUntil })
  const u = new URL('https://api.github.com/search/repositories')
  u.searchParams.set('q', `${query} in:name,description,topics`); u.searchParams.set('per_page', String(perPage))
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ProjectForgeAI/2.0' }
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`
  let res
  for (let attempt = 0; ; attempt++) { // one retry for transient network failures and 502-504
    try { res = await fetchImpl(u, { headers, signal: AbortSignal.timeout(env.searchTimeoutMs) }) }
    catch (err) { if (attempt < 1) { await new Promise((r) => setTimeout(r, env.searchRetryDelayMs)); continue } throw new GitHubError('network', describeNetworkError(err)) }
    if ([502, 503, 504].includes(res.status) && attempt < 1) { await new Promise((r) => setTimeout(r, env.searchRetryDelayMs)); continue }
    break
  }
  const remaining = res.headers?.get?.('x-ratelimit-remaining'), reset = Number(res.headers?.get?.('x-ratelimit-reset')) * 1000
  if (res.status === 429 || (res.status === 403 && remaining === '0')) {
    cooldownUntil = Math.min(reset || Date.now() + 60_000, Date.now() + 15 * 60_000)
    throw new GitHubError('rate_limit', 'GitHub rate limit reached', { resetAt: cooldownUntil })
  }
  if (res.status === 422) throw new GitHubError('invalid_query', 'GitHub rejected the search query')
  if (!res.ok) throw new GitHubError('http', `GitHub returned HTTP ${res.status}`)
  let body
  try { body = await res.json() } catch (err) { throw (err?.name === 'TimeoutError' || err?.name === 'AbortError') ? new GitHubError('network', describeNetworkError(err)) : new GitHubError('invalid_response', 'GitHub returned an unreadable response') }
  if (!body || !Array.isArray(body.items)) throw new GitHubError('invalid_response', 'GitHub returned an unexpected response')
  return { items: body.items.map(normalizeRepo).filter(Boolean), totalCount: Number(body.total_count) || 0 }
}
