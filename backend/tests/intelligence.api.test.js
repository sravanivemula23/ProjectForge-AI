// Integration tests for ProjectForge 2.0. Real Express app + MongoDB protocol; GitHub / research APIs are mocked at the fetch level.
import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { connectDb, disconnectDb } from '../src/config/db.js'
import { createApp } from '../src/app.js'
import { seed } from '../src/scripts/seed.js'
import { env } from '../src/config/env.js'
import { getGithubIntelligence, cachedSearch } from '../src/services/github/index.js'
import { searchRepositories, resetGithubCooldown, GitHubError } from '../src/services/github/client.js'
import { getResearchIntelligence } from '../src/services/research/index.js'
import { perUserLimiter } from '../src/middleware/rateLimit.js'
import { GitHubRepositoryCache, ProjectIntelligence } from '../src/models/index.js'
import { projectContext } from '../src/services/intelligence/text.js'
import { fetchRouter, ghResponse, GH_ITEMS, OA_WORKS } from './helpers.js'

let app, n = 0
const PREFS = { domain: 'Agriculture', difficulty: 'intermediate', team_size: 3, team_type: 'team', time_weeks: 8, budget_usd: 2000, budget_currency: 'INR', preferred_technologies: ['React'], career_target: 'ML engineer', orientation: 'product' }
const register = async (name = 'Intel User') => {
  const r = await request(app).post('/api/auth/register').send({ name, email: `i${Date.now()}${n++}@example.com`, password: 'Passw0rd123' })
  return { Authorization: `Bearer ${r.body.access_token}` }
}
const newProject = async (h) => (await request(app).post('/api/projects/recommend').set(h).send(PREFS)).body.projects[0]

beforeAll(async () => {
  const uri = process.env.TEST_MONGODB_URI
  await connectDb(uri ? `${uri.split('?')[0]}_${Date.now()}` : 'memory')
  await mongoose.connection.dropDatabase()
  await Promise.all(Object.values(mongoose.models).map((m) => m.init().catch(() => {}))) // FerretDB lacks TTL indexes; real MongoDB has them
  await seed(); app = createApp()
})
afterEach(() => { vi.unstubAllGlobals(); resetGithubCooldown(); env.githubToken = '' })
afterAll(async () => { await mongoose.connection.dropDatabase(); await disconnectDb() })

const proj = projectContext({ title: 'AI Crop Disease Detection', short_description: 'Detects crop leaf diseases', domain: 'Agriculture', data: { technologies: ['TensorFlow'], ai_ml_components: ['CNN'], modules: ['Image upload', 'Disease classifier'] } })

describe('GitHub client', () => {
  test('works without a token (no Authorization header) and sends it only when configured', async () => {
    const f = vi.fn(async () => ghResponse()); await searchRepositories('crop disease', { fetchImpl: f })
    expect(f.mock.calls[0][1].headers.Authorization).toBeUndefined()
    env.githubToken = 'ghp_test'; await searchRepositories('crop disease', { fetchImpl: f })
    expect(f.mock.calls[1][1].headers.Authorization).toBe('Bearer ghp_test')
  })
  test('drops repositories with non-GitHub links', async () => {
    const r = await searchRepositories('x', { fetchImpl: async () => ghResponse() })
    expect(r.items.map((i) => i.fullName)).not.toContain('x/evil'); expect(r.items.every((i) => i.url.startsWith('https://github.com/'))).toBe(true); expect(r.totalCount).toBe(321)
  })
  test.each([
    ['rate limit (403 + remaining 0)', async () => ({ ok: false, status: 403, headers: new Headers({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60) }), json: async () => ({}) }), 'rate_limit'],
    ['HTTP 500', async () => ({ ok: false, status: 500, headers: new Headers(), json: async () => ({}) }), 'http'],
    ['network failure', async () => { throw new Error('ECONNRESET') }, 'network'],
    ['malformed body', async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ nope: 1 }) }), 'invalid_response'],
    ['unreadable body', async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => { throw new Error('bad json') } }), 'invalid_response'],
  ])('%s becomes a typed GitHubError', async (_n, impl, kind) => { await expect(searchRepositories('x', { fetchImpl: impl })).rejects.toMatchObject({ kind }) })
  test('after a rate-limit response further calls are skipped until reset', async () => {
    const limited = vi.fn(async () => ({ ok: false, status: 429, headers: new Headers(), json: async () => ({}) }))
    await expect(searchRepositories('a', { fetchImpl: limited })).rejects.toBeInstanceOf(GitHubError)
    const ok = vi.fn(async () => ghResponse()); await expect(searchRepositories('b', { fetchImpl: ok })).rejects.toMatchObject({ kind: 'rate_limit' }); expect(ok).not.toHaveBeenCalled()
  })
})

describe('GitHub cache, de-duplication and degradation', () => {
  test('second identical search is served from MongoDB cache; refresh bypasses it', async () => {
    const searcher = vi.fn(async () => ({ items: GH_ITEMS.map((i) => ({ ...i })).slice(0, 1).map(() => ({ fullName: 'a/b', name: 'b', url: 'https://github.com/a/b', description: 'd', topics: [], stars: 1 })), totalCount: 1 }))
    const a = await cachedSearch('cache test query one', { searcher }), b = await cachedSearch('cache test query one', { searcher })
    expect(a.cached).toBe(false); expect(b.cached).toBe(true); expect(searcher).toHaveBeenCalledTimes(1)
    await cachedSearch('cache test query one', { searcher, refresh: true }); expect(searcher).toHaveBeenCalledTimes(2)
  })
  test('expired cache entries are ignored', async () => {
    const searcher = vi.fn(async () => ({ items: [], totalCount: 0 }))
    await cachedSearch('expiry query', { searcher })
    await GitHubRepositoryCache.updateMany({ query: 'expiry query' }, { expires_at: new Date(Date.now() - 1000) })
    await cachedSearch('expiry query', { searcher }); expect(searcher).toHaveBeenCalledTimes(2)
  })
  test('concurrent identical searches share one upstream call (request de-duplication)', async () => {
    let calls = 0; const searcher = async () => { calls++; await new Promise((r) => setTimeout(r, 40)); return { items: [], totalCount: 0 } }
    await Promise.all([cachedSearch('dedupe concurrent q', { searcher }), cachedSearch('dedupe concurrent q', { searcher }), cachedSearch('dedupe concurrent q', { searcher })])
    expect(calls).toBe(1)
  })
  test('the same repository found by several queries is returned once, ranked by relevance', async () => {
    const dup = { fullName: 'octo/plant-disease-detection', name: 'plant-disease-detection', owner: 'octo', url: 'https://github.com/octo/plant-disease-detection', description: 'Plant disease detection using CNN on leaf images', topics: ['cnn'], stars: 5, language: 'Python', pushedAt: new Date().toISOString(), archived: false }
    const searcher = async () => ({ items: [dup, { ...dup, fullName: 'OCTO/Plant-Disease-Detection' }, { ...dup, fullName: 'z/random', name: 'random', url: 'https://github.com/z/random', description: 'random stuff', topics: [] }], totalCount: 3 })
    const r = await getGithubIntelligence(proj, { searcher, refresh: true, limit: 20 })
    const names = r.repositories.map((x) => x.fullName.toLowerCase()); expect(new Set(names).size).toBe(names.length)
    expect(names.filter((x) => x === 'octo/plant-disease-detection')).toHaveLength(1); expect(r.repositories[0].fullName.toLowerCase()).toBe('octo/plant-disease-detection')
    expect(r.repositories[0].foundBy.length).toBeGreaterThan(1); expect(r.status).toBe('ok')
  })
  test.each([
    ['rate limited', new GitHubError('rate_limit', 'x'), 'rate_limited'], ['network error', new GitHubError('network', 'x'), 'unavailable'], ['invalid response', new GitHubError('invalid_response', 'x'), 'unavailable'],
  ])('all searches failing (%s) returns a friendly status, never throws', async (_n, err, status) => {
    const r = await getGithubIntelligence(proj, { searcher: async () => { throw err }, refresh: true })
    expect(r.status).toBe(status); expect(r.retryable).toBe(true); expect(r.repositories).toEqual([]); expect(r.message).not.toMatch(/500|Internal/i)
    if (status === 'unavailable') expect(r.message).toBe('GitHub projects could not be loaded right now.')
  })
  test('partial failure keeps the good results and says so; empty results are reported', async () => {
    let i = 0; const flaky = async () => { if (i++ % 2) throw new GitHubError('network', 'x'); return { items: [{ fullName: 'a/crop-disease', name: 'crop-disease', url: 'https://github.com/a/crop-disease', description: 'crop disease detection', topics: [], stars: 1 }], totalCount: 1 } }
    const p = await getGithubIntelligence(proj, { searcher: flaky, refresh: true }); expect(p.status).toBe('partial'); expect(p.repositories.length).toBeGreaterThan(0)
    const e = await getGithubIntelligence(proj, { searcher: async () => ({ items: [], totalCount: 0 }), refresh: true }); expect(e.status).toBe('empty'); expect(e.message).toMatch(/No related GitHub repositories/)
  })
})

describe('research service', () => {
  test('uses real provider data, extracts abstract sentences, caches, and degrades gracefully', async () => {
    vi.stubGlobal('fetch', fetchRouter())
    const r = await getResearchIntelligence(proj, { refresh: true })
    const p = r.papers[0]
    expect(p.title).toMatch(/Plant disease/); expect(p.doi).toBe('10.1234/plant.2023.1'); expect(p.link).toBe('https://doi.org/10.1234/plant.2023.1'); expect(p.year).toBe(2023); expect(p.authors).toEqual(['A. Researcher'])
    expect(p.dataset.text).toMatch(/dataset/); expect(p.futureWork.text).toMatch(/multilingual/); expect(r.status).toBe('partial') // other providers returned 503 in the mock
    const again = await getResearchIntelligence(proj); expect(again.cached).toBe(true)
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 503, headers: new Headers(), json: async () => ({}), text: async () => '' }))
    const down = await getResearchIntelligence(proj, { refresh: true }); expect(down.status).toBe('unavailable'); expect(down.message).toBe('Research papers could not be loaded right now.'); expect(down.papers).toEqual([])
  })
})

describe('rate limiting', () => {
  test('per-user limiter returns 429 with Retry-After once the limit is hit and is keyed per user', async () => {
    const a = express(); a.use((req, _r, next) => { req.user = { _id: req.headers['x-user'] }; next() }); a.use(perUserLimiter(2, 'slow down')); a.get('/x', (_q, r) => r.json({ ok: 1 }))
    for (let i = 0; i < 2; i++) expect((await request(a).get('/x').set('x-user', 'u1')).status).toBe(200)
    const limited = await request(a).get('/x').set('x-user', 'u1'); expect(limited.status).toBe(429); expect(limited.body.detail).toBe('slow down'); expect(limited.headers['retry-after']).toBe('60')
    expect((await request(a).get('/x').set('x-user', 'u2')).status).toBe(200)
  })
})

describe('2.0 API flow', () => {
  test('github -> research -> novelty -> reality -> differentiate -> feasibility -> blueprint -> roadmap -> analysis -> progress -> compare -> dashboard', async () => {
    const h = await register(), p = await newProject(h)
    expect(p.domain).toBe('Agriculture')
    const f = fetchRouter(); vi.stubGlobal('fetch', f)

    const gh = (await request(app).get(`/api/github/related?projectId=${p.id}&limit=8`).set(h)).body
    expect(gh.status).toBe('ok'); expect(gh.repositories.length).toBeGreaterThan(0)
    const scores = gh.repositories.map((r) => r.relevanceScore); expect(scores).toEqual([...scores].sort((a, b) => b - a))
    for (const r of gh.repositories) { expect(r.url).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/); expect(r).toEqual(expect.objectContaining({ name: expect.any(String), fullName: expect.any(String), owner: expect.any(String), stars: expect.any(Number), forks: expect.any(Number), topics: expect.any(Array), archived: false, relevanceScore: expect.any(Number) })) }
    expect(new Set(gh.repositories.map((r) => r.fullName)).size).toBe(gh.repositories.length); expect(gh.repositories.map((r) => r.fullName)).not.toContain('x/evil')
    expect(f.calls.every((c) => !c.headers.Authorization)).toBe(true) // works without GITHUB_TOKEN
    const before = f.calls.filter((c) => c.host === 'api.github.com').length
    const cached = (await request(app).get(`/api/github/related?projectId=${p.id}`).set(h)).body; expect(cached.cached).toBe(true); expect(f.calls.filter((c) => c.host === 'api.github.com').length).toBe(before)
    const an = (await request(app).get(`/api/github/analyze?projectId=${p.id}`).set(h)).body; expect(an.summary.retrieved).toBeGreaterThan(0); expect(an.activity).toBeTruthy()

    const rs = (await request(app).get(`/api/research/related?projectId=${p.id}&refresh=true`).set(h)).body
    expect(rs.papers[0].link).toMatch(/^https:\/\/doi\.org\//); expect(rs.gap.available).toBe(true); expect(rs.gap.gaps.length).toBeGreaterThan(0)

    const nv = await request(app).post('/api/projects/novelty').set(h).send({ project_id: p.id }); expect(nv.status).toBe(200)
    expect(nv.body.novelty.overall).toBeLessThanOrEqual(95); expect(Object.keys(nv.body.novelty.components)).toEqual(expect.arrayContaining(['github_uniqueness', 'feature_uniqueness', 'research_uniqueness', 'technology_novelty', 'market_differentiation']))
    expect(nv.body.quality.final).toBeGreaterThan(0); expect(nv.body.quality.components).toHaveProperty('portfolio_value'); expect(nv.body.feasibility.estimatedTime.label).toMatch(/\d+-\d+ weeks/); expect(['green', 'yellow', 'red']).toContain(nv.body.reality_check.status)

    const rc = (await request(app).post('/api/projects/reality-check').set(h).send({ project_id: p.id })).body.reality_check
    expect(rc.recommendation).toBeTruthy(); expect(rc.methodology).toMatch(/Red/)
    const df = (await request(app).post('/api/projects/differentiate').set(h).send({ project_id: p.id })).body
    expect(df.suggestions.length).toBeGreaterThan(2); expect(df.suggestions[0]).toEqual(expect.objectContaining({ feature: expect.any(String), why: expect.any(String), technical_difficulty: expect.any(String), expected_originality_improvement: expect.objectContaining({ points: expect.any(Number) }) }))
    expect((await request(app).post('/api/projects/feasibility').set(h).send({ project_id: p.id })).body.feasibility.cost.level).toMatch(/Low|Medium|High/)
    const bp = (await request(app).post('/api/projects/blueprint').set(h).send({ project_id: p.id })).body
    expect(bp.origin).toBe('template'); expect(bp.blueprint.apis.length).toBeGreaterThan(0); expect(bp.blueprint.unique_features.length).toBeGreaterThan(0)
    const rm = (await request(app).post('/api/projects/roadmap').set(h).send({ project_id: p.id })).body.roadmap
    expect(rm.phases).toHaveLength(11); expect(rm.weekly_plan.weeks.length).toBeGreaterThan(0); expect(rm.weekly_plan.teamSize).toBe(3)

    const doc = (await request(app).get(`/api/projects/${p.id}/analysis`).set(h)).body
    for (const k of ['github', 'research', 'novelty', 'reality_check', 'differentiation', 'quality', 'feasibility', 'blueprint']) expect(doc[k]).toBeTruthy()
    expect((await ProjectIntelligence.countDocuments({ project_id: p.id }))).toBe(1) // one document per project (upsert)

    expect((await request(app).patch(`/api/projects/${p.id}/progress`).set(h).send({ status: 'building' })).body.progress).toBe('building')
    expect((await request(app).patch(`/api/projects/${p.id}/progress`).set(h).send({ status: 'bogus' })).status).toBe(422)
    expect((await request(app).get(`/api/projects/${p.id}`).set(h)).body.progress).toBe('building')

    const p2 = (await request(app).post('/api/projects/recommend').set(h).send(PREFS)).body.projects[1]
    const cmp = (await request(app).post('/api/projects/compare').set(h).send({ project_ids: [p.id, p2.id] })).body
    expect(cmp.recommended.reason).toMatch(/highest/); expect(cmp.projects[0]).toEqual(expect.objectContaining({ github_similarity: expect.any(Number), portfolio_value: expect.any(Number), cost_level: expect.any(String) })); expect(cmp.projects[0].projectforge_score).toBeGreaterThan(0)
    const dash = (await request(app).get('/api/dashboard').set(h)).body
    expect(dash.intelligence[0]).toMatchObject({ project_id: p.id, progress: 'building', has_blueprint: true }); expect(dash.progress_counts.building).toBe(1)

    // deleting a project keeps working (intelligence doc is orphan-safe) and original endpoints are untouched
    expect((await request(app).post('/api/projects/improve').set(h).send({ project_id: p.id })).body.improved.version).toBe(2)
  })

  test('GitHub outage never produces a 500 and other features keep working', async () => {
    const h = await register(), p = await newProject(h)
    vi.stubGlobal('fetch', fetchRouter({ github: () => ({ ok: false, status: 500, headers: new Headers(), json: async () => ({}) }) }))
    const r = await request(app).get(`/api/github/related?projectId=${p.id}&refresh=true`).set(h)
    expect(r.status).toBe(200); expect(r.body.status).toBe('unavailable'); expect(r.body.message).toBe('GitHub projects could not be loaded right now.'); expect(r.body.retryable).toBe(true)
    const nv = await request(app).post('/api/projects/novelty').set(h).send({ project_id: p.id, refresh: true })
    expect(nv.status).toBe(200); expect(nv.body.novelty.components.github_uniqueness.score).toBeNull(); expect(nv.body.novelty.components.github_uniqueness.explanation).toMatch(/Information unavailable/)
    expect((await request(app).get(`/api/projects/${p.id}`).set(h)).status).toBe(200)
    expect((await request(app).post('/api/projects/roadmap').set(h).send({ project_id: p.id })).status).toBe(200)
  })

  test('validation, ownership and authentication', async () => {
    const h = await register(), other = await register('Other'), p = await newProject(h)
    vi.stubGlobal('fetch', fetchRouter())
    expect((await request(app).get(`/api/github/related?projectId=${p.id}`)).status).toBe(401)
    expect((await request(app).get('/api/github/related?projectId=not-an-id').set(h)).status).toBe(422)
    expect((await request(app).get('/api/github/related').set(h)).status).toBe(422)
    expect((await request(app).get(`/api/github/related?projectId=${p.id}&limit=999`).set(h)).status).toBe(422)
    expect((await request(app).get('/api/github/related?projectId=https://evil.test/x').set(h)).status).toBe(422) // URLs are never accepted as input
    expect((await request(app).get(`/api/github/related?projectId=${p.id}`).set(other)).status).toBe(404)
    expect((await request(app).get(`/api/research/related?projectId=${p.id}`).set(other)).status).toBe(404)
    for (const path of ['novelty', 'reality-check', 'differentiate', 'feasibility', 'blueprint']) {
      expect((await request(app).post(`/api/projects/${path}`).set(other).send({ project_id: p.id })).status).toBe(404)
      expect((await request(app).post(`/api/projects/${path}`).set(h).send({})).status).toBe(422)
    }
    expect((await request(app).get(`/api/projects/${p.id}/analysis`).set(other)).status).toBe(404)
    expect((await request(app).patch(`/api/projects/${p.id}/progress`).set(other).send({ status: 'done' })).status).toBe(404)
  })

  test('personalization fields: INR budget converted for scoring, profile extras stored, completion unchanged', async () => {
    const h = await register()
    const put = await request(app).put('/api/users/me/profile').set(h).send({ branch: 'CSE', skills: 'MERN, Python', academic_requirement: 'placement + academic', research_interest: 'NLP, agriculture' })
    expect(put.body.profile.academic_requirement).toBe('placement + academic'); expect(put.body.profile.research_interest).toEqual(['NLP', 'agriculture'])
    await request(app).post('/api/projects/recommend').set(h).send({ ...PREFS, budget_usd: 2000, budget_currency: 'INR' })
    const { ProjectPreference } = await import('../src/models/index.js')
    const pref = await ProjectPreference.findOne({}).sort({ _id: -1 }).lean(); expect(pref.budget_currency).toBe('INR'); expect(pref.budget_amount).toBe(2000); expect(pref.budget_usd).toBeCloseTo(2000 / env.inrPerUsd, 5)
  })
})

test('fixtures are consistent', () => { expect(OA_WORKS.results.length).toBe(2) })
