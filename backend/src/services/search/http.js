import { env } from '../../config/env.js'

export class SearchError extends Error {}
const UA = { 'User-Agent': 'ProjectForgeAI/2.0 (student project novelty analysis)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Human-readable network failure that keeps the real cause (timeout vs DNS vs reset) visible in logs. */
export function describeNetworkError(err, timeoutMs = env.searchTimeoutMs) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return `Network error: timed out after ${Math.round(timeoutMs / 1000)}s`
  const code = err?.cause?.code || err?.code
  return `Network error: ${code || err?.cause?.message || err?.message || err?.name || 'unknown'}`
}

/** GET with one retry for transient failures (network/timeout, 502-504, and 429 when the provider sends a short Retry-After). */
export async function getResponse(url, params, headers = {}, { retries = 1 } = {}) {
  const u = new URL(url)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  for (let attempt = 0; ; attempt++) {
    let res
    try { res = await fetch(u, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(env.searchTimeoutMs), redirect: 'follow' }) }
    catch (err) {
      if (attempt < retries) { await sleep(env.searchRetryDelayMs); continue }
      throw new SearchError(describeNetworkError(err))
    }
    if (res.status === 429) {
      const wait = Number(res.headers?.get?.('retry-after'))
      if (attempt < retries && wait > 0 && wait <= 5) { await sleep(wait * 1000); continue }
      throw new SearchError('Rate limited by provider (add an API key/token in .env for higher limits)')
    }
    if ([502, 503, 504].includes(res.status) && attempt < retries) { await sleep(env.searchRetryDelayMs); continue }
    if (res.status >= 400) throw new SearchError(`Provider returned HTTP ${res.status}`)
    return res
  }
}

/** Body reads can also time out or fail mid-stream; report that honestly instead of calling it a parse error. */
export async function readText(res) {
  try { return await res.text() } catch (err) { throw new SearchError(`Network error: response could not be read (${err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'timed out' : err?.cause?.code || err?.message || 'unknown'})`) }
}
export async function readJson(res) {
  try { return await res.json() } catch (err) {
    if (err instanceof SyntaxError || /json/i.test(err?.message || '')) throw new SearchError('Provider returned an unreadable response')
    throw new SearchError(`Network error: response could not be read (${err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'timed out' : err?.cause?.code || err?.message || 'unknown'})`)
  }
}
export const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
