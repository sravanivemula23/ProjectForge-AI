import { XMLParser } from 'fast-xml-parser'
import { env } from '../../config/env.js'
import { getResponse, readJson, readText, SearchError, stripTags } from './http.js'

const item = (o) => ({ authors: [], venue: '', citations: null, stars: null, description: '', published: '', ...o })

export async function searchGithub(query, limit = 10) {
  const headers = { Accept: 'application/vnd.github+json' }
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`
  const r = await getResponse('https://api.github.com/search/repositories', { q: `${query} in:name,description,topics`, per_page: limit }, headers)
  return ((await readJson(r)).items || []).map((it) => item({
    source: 'github', kind: 'repo', title: it.full_name || '', url: it.html_url || '', description: it.description || '', published: (it.created_at || '').slice(0, 10),
    stars: it.stargazers_count, extra: { language: it.language, topics: it.topics || [], updated: (it.pushed_at || '').slice(0, 10) },
  }))
}

export async function searchSemanticScholar(query, limit = 10) {
  const headers = env.semanticScholarKey ? { 'x-api-key': env.semanticScholarKey } : {}
  const r = await getResponse('https://api.semanticscholar.org/graph/v1/paper/search',
    { query, limit, fields: 'title,abstract,url,year,authors,venue,citationCount,publicationDate,externalIds' }, headers)
  return ((await readJson(r)).data || []).map((p) => item({
    source: 'semantic_scholar', kind: 'paper', title: p.title || '', url: p.url || '', description: p.abstract || '', published: p.publicationDate || String(p.year || ''),
    authors: (p.authors || []).map((a) => a.name || '').slice(0, 6), venue: p.venue || '', citations: p.citationCount ?? null,
    doi: p.externalIds?.DOI || null,
  }))
}

const openalexAbstract = (inv) => {
  if (!inv) return ''
  const pos = {}
  for (const [w, idxs] of Object.entries(inv)) for (const i of idxs) pos[i] = w
  return Object.keys(pos).map(Number).sort((a, b) => a - b).map((i) => pos[i]).join(' ')
}
export async function searchOpenalex(query, limit = 10) {
  const params = { search: query, 'per-page': limit }
  if (env.openalexKey) params.api_key = env.openalexKey
  if (env.openalexMailto) params.mailto = env.openalexMailto
  const r = await getResponse('https://api.openalex.org/works', params)
  return ((await readJson(r)).results || []).map((w) => item({
    source: 'openalex', kind: 'paper', title: w.title || '', url: w.doi || w.id || '', description: openalexAbstract(w.abstract_inverted_index), published: w.publication_date || '',
    authors: (w.authorships || []).map((a) => a.author?.display_name || '').slice(0, 6), venue: w.primary_location?.source?.display_name || '', citations: w.cited_by_count ?? null,
    doi: w.doi ? String(w.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : null,
  }))
}

const xml = new XMLParser({ ignoreAttributes: false, trimValues: true })
export async function searchArxiv(query, limit = 10) {
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 4).map((t) => `all:${t}`).join(' AND ')
  const r = await getResponse('https://export.arxiv.org/api/query', { search_query: terms, max_results: limit, sortBy: 'relevance' })
  const body = await readText(r) // a timeout while reading is reported as a network problem, not as bad XML
  let doc
  try { doc = xml.parse(body) } catch { throw new SearchError('arXiv returned unparsable XML') }
  if (!doc?.feed) throw new SearchError('arXiv returned an unexpected response')
  const entries = [].concat(doc?.feed?.entry || [])
  return entries.map((e) => item({
    source: 'arxiv', kind: 'paper', title: stripTags(e.title), url: e.id || '', description: stripTags(e.summary), published: String(e.published || '').slice(0, 10),
    authors: [].concat(e.author || []).map((a) => a.name).slice(0, 6), venue: 'arXiv preprint',
  }))
}

export async function searchCrossref(query, limit = 10) {
  const params = { query, rows: limit, select: 'title,abstract,URL,DOI,issued,author,container-title,is-referenced-by-count' }
  if (env.crossrefMailto) params.mailto = env.crossrefMailto
  const r = await getResponse('https://api.crossref.org/works', params)
  return (((await readJson(r)).message || {}).items || []).map((it) => item({
    source: 'crossref', kind: 'paper', title: (it.title || [''])[0], url: it.URL || '', description: stripTags(it.abstract), published: ((it.issued?.['date-parts'] || [[]])[0] || []).filter(Boolean).join('-'),
    authors: (it.author || []).map((a) => `${a.given || ''} ${a.family || ''}`.trim()).slice(0, 6), venue: (it['container-title'] || [''])[0], citations: it['is-referenced-by-count'] ?? null, doi: it.DOI || null,
  }))
}

// name -> [kind, fn]. Exported as a mutable object so tests can stub providers.
export const PROVIDERS = {
  github: ['repo', searchGithub], semantic_scholar: ['paper', searchSemanticScholar], openalex: ['paper', searchOpenalex],
  arxiv: ['paper', searchArxiv], crossref: ['paper', searchCrossref],
}
