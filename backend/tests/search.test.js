import { afterEach, describe, expect, test, vi } from 'vitest'
import { searchGithub, searchOpenalex, searchArxiv, searchCrossref, searchSemanticScholar, PROVIDERS } from '../src/services/search/providers.js'
import { runSearch } from '../src/services/search/index.js'
import { SearchError } from '../src/services/search/http.js'

afterEach(() => vi.unstubAllGlobals())
const respond = (body, { status = 200, text = false } = {}) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status < 400, status, json: async () => body, text: async () => body })))

describe('provider parsing (fixtures, not real results)', () => {
  test('github', async () => {
    respond({ items: [{ full_name: 'a/b', html_url: 'https://github.com/a/b', description: 'd', stargazers_count: 5, created_at: '2022-01-01T00:00:00Z' }] })
    const r = await searchGithub('x'); expect(r[0]).toMatchObject({ source: 'github', kind: 'repo', stars: 5, published: '2022-01-01' })
  })
  test('openalex rebuilds inverted-index abstract', async () => {
    respond({ results: [{ title: 'T', doi: 'https://doi.org/x', abstract_inverted_index: { world: [1], hello: [0] }, authorships: [{ author: { display_name: 'Z' } }], cited_by_count: 2 }] })
    const r = await searchOpenalex('x'); expect(r[0].description).toBe('hello world'); expect(r[0].authors).toEqual(['Z'])
  })
  test('semantic scholar and crossref', async () => {
    respond({ data: [{ title: 'S', abstract: 'abs', url: 'u', year: 2020, authors: [{ name: 'A' }], citationCount: 3 }] })
    expect((await searchSemanticScholar('x'))[0].citations).toBe(3)
    respond({ message: { items: [{ title: ['C'], URL: 'u', abstract: '<jats:p>Hi</jats:p>', issued: { 'date-parts': [[2021, 5]] }, author: [{ given: 'A', family: 'B' }] }] } })
    const c = (await searchCrossref('x'))[0]; expect(c.description).toBe('Hi'); expect(c.published).toBe('2021-5')
  })
  test('arxiv parses Atom XML', async () => {
    respond('<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/1</id><title> A  title </title><summary>Sum</summary><published>2020-01-02T00:00:00Z</published><author><name>N</name></author></entry></feed>')
    const r = await searchArxiv('x y'); expect(r[0]).toMatchObject({ title: 'A title', description: 'Sum', published: '2020-01-02', authors: ['N'] })
  })
  test('429 and network errors become SearchError', async () => {
    respond({}, { status: 429 }); await expect(searchGithub('x')).rejects.toBeInstanceOf(SearchError)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom') })); await expect(searchGithub('x')).rejects.toThrow(/Network error/)
  })
})

describe('runSearch aggregation', () => {
  test('reports failures per provider, dedupes, never fabricates', async () => {
    const saved = { ...PROVIDERS }
    const item = (o) => ({ authors: [], description: '', published: '', ...o })
    PROVIDERS.github = ['repo', async () => [item({ source: 'github', kind: 'repo', title: 'r', url: 'https://x/r' })]]
    PROVIDERS.arxiv = ['paper', async () => { throw new SearchError('Rate limited') }]
    PROVIDERS.openalex = ['paper', async () => [item({ source: 'openalex', kind: 'paper', title: 'p', url: 'https://x/p' }), item({ source: 'openalex', kind: 'paper', title: 'p dup', url: 'https://x/p/' })]]
    PROVIDERS.crossref = ['paper', async () => []]; PROVIDERS.semantic_scholar = ['paper', async () => []]
    const { items, status } = await runSearch(['q'])
    expect(items.map((i) => i.title).sort()).toEqual(['p', 'r']); expect(status.arxiv).toMatchObject({ ok: false, error: 'Rate limited' }); expect(status.github.ok).toBe(true)
    Object.assign(PROVIDERS, saved)
  })
})

describe('transient failure handling', () => {
  const ok = (body) => ({ ok: true, status: 200, headers: new Headers(), json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) })
  test('a transient network error is retried once and then succeeds', async () => {
    let n = 0; vi.stubGlobal('fetch', vi.fn(async () => { if (n++ === 0) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }); return ok({ items: [] }) }))
    expect(await searchGithub('x')).toEqual([]); expect(fetch).toHaveBeenCalledTimes(2)
  })
  test('a persistent network error reports the real cause, not just "TypeError"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }) }))
    await expect(searchOpenalex('x')).rejects.toThrow(/Network error: ENOTFOUND/); expect(fetch).toHaveBeenCalledTimes(2)
  })
  test('timeouts say they timed out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }) }))
    await expect(searchCrossref('x')).rejects.toThrow(/timed out after \d+s/)
  })
  test('429 with a short Retry-After is retried once; without it the error is immediate', async () => {
    let n = 0; vi.stubGlobal('fetch', vi.fn(async () => (n++ === 0 ? { ok: false, status: 429, headers: new Headers({ 'retry-after': '0.001' }), json: async () => ({}) } : ok({ data: [] }))))
    expect(await searchSemanticScholar('x')).toEqual([]); expect(fetch).toHaveBeenCalledTimes(2)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, headers: new Headers(), json: async () => ({}) })))
    await expect(searchSemanticScholar('x')).rejects.toThrow(/Rate limited/); expect(fetch).toHaveBeenCalledTimes(1)
  })
  test('arXiv: a failure while reading the body is a network error, only real bad XML is "unparsable"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), text: async () => { throw Object.assign(new Error('aborted'), { name: 'TimeoutError' }) } })))
    await expect(searchArxiv('a b')).rejects.toThrow(/response could not be read \(timed out\)/)
    vi.stubGlobal('fetch', vi.fn(async () => ok('<html>not atom</html>')))
    await expect(searchArxiv('a b')).rejects.toThrow(/unexpected response|unparsable/)
  })
  test('anonymous Semantic Scholar is queried once (its shared pool is tiny); other providers twice', async () => {
    const saved = { ...PROVIDERS }, seen = {}
    for (const [k, [kind]] of Object.entries(PROVIDERS)) PROVIDERS[k] = [kind, async (q) => { seen[k] = (seen[k] || 0) + 1; return [] }]
    await runSearch(['q1', 'q2'], { kinds: ['paper'] })
    expect(seen.semantic_scholar).toBe(1); expect(seen.openalex).toBe(2); expect(seen.crossref).toBe(2)
    Object.assign(PROVIDERS, saved)
  })
})
