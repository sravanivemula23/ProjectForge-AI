import crypto from 'node:crypto'
import { env } from '../../config/env.js'
import { ResearchPaperCache } from '../../models/index.js'
import { runSearch } from '../search/index.js'
import { PROVIDERS } from '../search/providers.js'
import { projectContext, contentToks, projectKeywords, set, expand, dice, cosineSets, toks } from '../intelligence/text.js'
import { extractFromAbstract } from './extract.js'

const MESSAGES = { unavailable: 'Research papers could not be loaded right now.', empty: 'No related research papers were found.', partial: 'Some research sources failed, so these results may be incomplete.' }
const inflight = new Map()

export function buildResearchQueries(c) {
  const kw = projectKeywords(c, 8), title = contentToks(c.title)
  return [...new Set([title.slice(0, 7).join(' '), [...kw.slice(0, 3), ...contentToks(c.ai_ml_components.join(' ')).slice(0, 3)].join(' '), [...kw.slice(0, 2), ...contentToks(c.domain)].join(' ')].map((q) => q.trim()).filter((q) => q.length > 3))].slice(0, 3)
}

const year = (p) => { const m = String(p || '').match(/\b(19|20)\d{2}\b/); return m ? Number(m[0]) : null }
export function safePaperLink(it) {
  const doi = it.doi ? String(it.doi).trim() : null
  if (doi && /^10\.\d{4,9}\/\S+$/.test(doi)) return { doi, link: `https://doi.org/${doi}` }
  try { const u = new URL(String(it.url || '').replace(/^http:\/\/arxiv\.org/, 'https://arxiv.org')); return u.protocol === 'https:' ? { doi: null, link: u.href } : { doi: null, link: null } } catch { return { doi: null, link: null } }
}

export function scorePaper(c, paper) {
  const pTitle = set(contentToks(c.title)), pAll = expand(contentToks(`${c.title} ${c.short_description} ${c.ai_ml_components.join(' ')}`))
  const tTitle = set(contentToks(paper.title)), tAll = set(toks(`${paper.title} ${paper.abstract}`))
  const sim = 0.45 * dice(pTitle, tTitle) + 0.35 * cosineSets(pAll, tAll) + 0.2 * (projectKeywords(c, 6).filter((k) => tAll.has(k)).length / Math.max(1, Math.min(6, projectKeywords(c, 6).length)))
  return Math.round(Math.min(1, sim) * 100)
}

export async function cachedPaperSearch(queries, { refresh = false, searcher = runSearch, userId = null } = {}) {
  const key = crypto.createHash('sha256').update(queries.join('|').toLowerCase()).digest('hex')
  if (!refresh) {
    const hit = await ResearchPaperCache.findOne({ query_hash: key }).lean().catch(() => null)
    if (hit && hit.expires_at > new Date()) return { items: hit.items, status: hit.sources_status, cached: true }
  }
  if (inflight.has(key)) return inflight.get(key)
  const p = (async () => {
    try {
      const { items, status } = await searcher(queries, { kinds: ['paper'], limit: 8, userId })
      if (Object.values(status).some((s) => s.ok)) await ResearchPaperCache.updateOne({ query_hash: key }, { $set: { queries, items, sources_status: status, fetched_at: new Date(), expires_at: new Date(Date.now() + env.researchCacheTtlHours * 3600_000) } }, { upsert: true }).catch(() => {})
      return { items, status, cached: false }
    } finally { inflight.delete(key) }
  })()
  inflight.set(key, p)
  return p
}

/** Related papers from real providers only; extractive abstract analysis; never fabricates authors, DOIs or results. */
export async function getResearchIntelligence(project, { limit = 8, refresh = false, searcher, userId = null } = {}) {
  const c = project.technologies ? project : projectContext(project)
  let raw
  try { raw = await cachedPaperSearch(buildResearchQueries(c), { refresh, searcher, userId }) } catch { raw = { items: [], status: {}, cached: false } }
  const statuses = Object.values(raw.status || {})
  const failedAll = !statuses.some((s) => s.ok)
  const papers = (raw.items || []).filter((it) => it.kind === 'paper' && it.title).map((it) => {
    const { doi, link } = safePaperLink(it)
    return { title: it.title, authors: it.authors || [], year: year(it.published), published: it.published || null, venue: it.venue || null, doi, link, source: it.source, citations: it.citations ?? null,
      abstract: it.description || '', relevanceScore: scorePaper(c, { title: it.title, abstract: it.description || '' }), ...extractFromAbstract(it.description) }
  }).filter((p) => p.relevanceScore > 0).sort((a, b) => Number(b.hasAbstract) - Number(a.hasAbstract) || b.relevanceScore - a.relevanceScore || (b.citations || 0) - (a.citations || 0)).slice(0, 15)
  let status = 'ok', message = null
  if (failedAll) { status = 'unavailable'; message = MESSAGES.unavailable } else if (!papers.length) { status = 'empty'; message = MESSAGES.empty } else if (statuses.some((s) => !s.ok)) { status = 'partial'; message = MESSAGES.partial }
  return { status, message, retryable: status !== 'ok' && status !== 'empty', papers: papers.slice(0, Math.max(1, Math.min(limit, 15))), totalAvailable: papers.length, sourcesStatus: raw.status, cached: !!raw.cached, generatedAt: new Date().toISOString(),
    note: 'Papers come from Semantic Scholar, OpenAlex, arXiv and Crossref. Methodology/dataset/result fields are sentences extracted from each real abstract; "Information unavailable" means the abstract did not contain it.' }
}
export { PROVIDERS }
