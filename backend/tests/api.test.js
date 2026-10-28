// Integration tests: real Express app + real MongoDB wire protocol. External search APIs are stubbed with clearly-fake fixtures.
// DB: TEST_MONGODB_URI if set (e.g. mongodb://127.0.0.1:27017/pf_test), otherwise an in-memory MongoDB is started.
import request from 'supertest'
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { connectDb, disconnectDb } from '../src/config/db.js'
import { createApp } from '../src/app.js'
import { seed } from '../src/scripts/seed.js'
import { PROVIDERS } from '../src/services/search/providers.js'
import { SearchError } from '../src/services/search/http.js'

let app
const FAKE = [
  { source: 'github', kind: 'repo', title: 'test/fracture-cnn', url: 'https://example.test/repo1', description: 'CNN fracture detection on X-ray images', published: '2023-01-01', authors: [], venue: '', citations: null, stars: 12 },
  { source: 'arxiv', kind: 'paper', title: 'Fracture classification with deep learning', url: 'https://example.test/paper1', description: 'We classify fractures in x-ray images using convolutional neural networks', published: '2022-05-01', authors: ['A. Author'], venue: 'arXiv preprint', citations: null, stars: null },
  { source: 'openalex', kind: 'paper', title: 'Cooking recipes dataset', url: 'https://example.test/paper2', description: 'Unrelated recipe corpus', published: '2021-01-01', authors: [], venue: '', citations: 3, stars: null },
]
const stub = (items) => {
  for (const [name, [kind]] of Object.entries(PROVIDERS)) PROVIDERS[name] = [kind, async () => items.filter((i) => i.source === name)]
}
const ORIGINAL = { ...PROVIDERS }
const PREFS = { domain: 'Healthcare', difficulty: 'advanced', team_size: 2, team_type: 'team', time_weeks: 16, budget_usd: 50, preferred_technologies: ['PyTorch'], orientation: 'research', career_target: 'ML engineer' }
let n = 0
const register = async (name = 'Test User') => {
  const r = await request(app).post('/api/auth/register').send({ name, email: `u${Date.now()}${n++}@example.com`, password: 'Passw0rd123' })
  expect(r.status).toBe(201)
  return { Authorization: `Bearer ${r.body.access_token}` }
}

beforeAll(async () => {
  const uri = process.env.TEST_MONGODB_URI
  await connectDb(uri ? `${uri.split('?')[0]}_${Date.now()}${uri.includes('?') ? '?' + uri.split('?')[1] : ''}` : 'memory')
  await mongoose.connection.dropDatabase()
  await Promise.all(Object.values(mongoose.models).map((m) => m.init().catch(() => {}))) // FerretDB lacks TTL indexes; real MongoDB supports them
  await seed()
  app = createApp()
})
afterAll(async () => { Object.assign(PROVIDERS, ORIGINAL); await mongoose.connection.dropDatabase(); await disconnectDb() })

describe('auth', () => {
  test('health', async () => { const r = await request(app).get('/api/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('ok') })
  test('register, duplicate, login, me', async () => {
    const body = { name: 'Alice', email: 'alice@example.com', password: 'Passw0rd123' }
    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(201)
    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(409)
    expect((await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'wrong' })).status).toBe(401)
    const tok = (await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'Passw0rd123' })).body.access_token
    const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${tok}`)
    expect(me.status).toBe(200); expect(me.body.email).toBe('alice@example.com'); expect(me.body.role).toBe('user'); expect(me.body.password_hash).toBeUndefined()
  })
  test('validation (422 with detail) and protection (401)', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'A', email: 'bad', password: 'short' })
    expect(r.status).toBe(422); expect(r.body.detail).toMatch(/check your input/i)
    expect((await request(app).get('/api/users/me')).status).toBe(401)
    expect((await request(app).get('/api/projects').set('Authorization', 'Bearer nope')).status).toBe(401)
    expect((await request(app).get('/api/admin/stats').set('Authorization', 'Bearer nope')).status).toBe(401)
  })
  test('password is hashed with bcrypt', async () => {
    const { User } = await import('../src/models/index.js')
    const u = await User.findOne({ email: 'alice@example.com' }).select('+password_hash')
    expect(u.password_hash).toMatch(/^\$2[aby]\$/); expect(u.password_hash).not.toContain('Passw0rd123')
  })
  test('forgot + reset password', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Carol C', email: 'carol@example.com', password: 'Passw0rd123' })
    const tok = (await request(app).post('/api/auth/forgot-password').send({ email: 'carol@example.com' })).body.dev_reset_token
    expect((await request(app).post('/api/auth/reset-password').send({ token: tok, password: 'NewPassw0rd1' })).status).toBe(200)
    expect((await request(app).post('/api/auth/reset-password').send({ token: tok, password: 'NewPassw0rd2' })).status).toBe(400)
    expect((await request(app).post('/api/auth/login').send({ email: 'carol@example.com', password: 'NewPassw0rd1' })).status).toBe(200)
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' })
    expect(unknown.status).toBe(200); expect(unknown.body.dev_reset_token).toBeUndefined()
  })
  test('malformed JSON gives 400', async () => {
    const r = await request(app).post('/api/auth/login').set('content-type', 'application/json').send('{bad')
    expect(r.status).toBe(400)
  })
})

describe('roles and seed data', () => {
  test('non-admin forbidden, admin allowed', async () => {
    expect((await request(app).get('/api/admin/stats').set(await register())).status).toBe(403)
    const tok = (await request(app).post('/api/auth/login').send({ email: 'admin@projectforge.ai', password: 'Admin@12345' })).body.access_token
    const h = { Authorization: `Bearer ${tok}` }
    const s = await request(app).get('/api/admin/stats').set(h)
    expect(s.status).toBe(200); expect(s.body.users.total).toBeGreaterThanOrEqual(2); expect(s.body.users.admins).toBe(1)
    expect((await request(app).get('/api/admin/users').set(h)).body.users.length).toBeGreaterThanOrEqual(2)
    expect((await request(app).get('/api/admin/logs').set(h)).status).toBe(200)
    const me = (await request(app).get('/api/users/me').set(h)).body
    expect((await request(app).patch(`/api/admin/users/${me.id}`).set(h).send({ role: 'user' })).status).toBe(400)
  })
  test('demo user has labelled demo projects', async () => {
    const tok = (await request(app).post('/api/auth/login').send({ email: 'demo@projectforge.ai', password: 'Demo@12345' })).body.access_token
    const projs = (await request(app).get('/api/projects').set('Authorization', `Bearer ${tok}`)).body.projects
    expect(projs.length).toBeGreaterThanOrEqual(8); expect(projs.every((p) => p.is_demo && p.scores.overall > 0)).toBe(true)
  })
  test('profile update and completion', async () => {
    const h = await register()
    const r = await request(app).put('/api/users/me/profile').set(h).send({ skills: 'Python, React', career_goal: 'ML engineer', experience_level: 'intermediate' })
    expect(r.status).toBe(200); expect(r.body.profile.skills).toEqual(['Python', 'React']); expect(r.body.profile_completion).toBeGreaterThan(0)
  })
})

describe('project flow', () => {
  test('recommend -> analyze -> improve -> roadmap -> architecture -> docs -> save -> compare -> export -> delete', async () => {
    const h = await register()
    const rec = (await request(app).post('/api/projects/recommend').set(h).send(PREFS)).body
    expect(rec.projects.length).toBeGreaterThanOrEqual(5); expect(rec.projects[0].rank).toBe(1); expect(rec.projects[0].domain).toBe('Healthcare')
    const s = rec.projects[0].scores
    expect(s.novelty_verified).toBe(false); expect(Object.keys(s.scores)).toEqual(expect.arrayContaining(['novelty', 'feasibility', 'career_relevance', 'research_potential', 'market_potential', 'implementation']))
    const pid = rec.projects[0].id
    expect((await request(app).get('/api/projects/recommendations').set(h)).body.projects.length).toBe(rec.projects.length)

    stub(FAKE)
    const an = await request(app).post('/api/projects/analyze').set(h).send({ project_id: pid })
    expect(an.status).toBe(200)
    const a = an.body.analysis
    expect(a.novelty_score).toBeGreaterThanOrEqual(0); expect(a.novelty_score).toBeLessThanOrEqual(95); expect(a.existing_similarity).not.toBeNull()
    expect(a.summary.improvements.length).toBeGreaterThanOrEqual(5)
    expect(a.similar_projects[0].verified).toBe(true); expect(a.research_papers).toHaveLength(2)
    expect(a.research_papers[0].similarity).toBeGreaterThanOrEqual(a.research_papers[1].similarity)
    expect(a.similar_projects[0].embedding).toBeUndefined()
    expect(an.body.project.scores.novelty_verified).toBe(true)
    expect(a.summary.corpus_matches).toBeDefined()

    const imp = (await request(app).post('/api/projects/improve').set(h).send({ project_id: pid })).body
    expect(imp.improved.version).toBe(2); expect(imp.added_features.length).toBeGreaterThan(0); expect(imp.improved.title).not.toBe(imp.original.title)
    const rm = (await request(app).post('/api/projects/roadmap').set(h).send({ project_id: pid })).body
    expect(rm.roadmap.phases).toHaveLength(11); expect(rm.roadmap.total_weeks).toBeGreaterThan(0)
    expect((await request(app).post('/api/projects/architecture').set(h).send({ project_id: pid })).body.architecture.layers.length).toBeGreaterThanOrEqual(3)
    const doc = (await request(app).post('/api/projects/documentation').set(h).send({ project_id: pid })).body.documentation
    expect(doc.abstract).toBeTruthy(); expect(doc.references.some((r) => r.includes('example.test'))).toBe(true)

    expect((await request(app).post(`/api/projects/${pid}/save`).set(h)).body.saved).toBe(true)
    expect((await request(app).post(`/api/projects/${pid}/save`).set(h)).body.saved).toBe(true) // idempotent
    expect((await request(app).post(`/api/projects/${pid}/favorite`).set(h)).body.favorite).toBe(true)
    expect((await request(app).get('/api/projects?scope=saved').set(h)).body.projects).toHaveLength(1)
    expect((await request(app).get('/api/projects?scope=analyzed').set(h)).body.projects).toHaveLength(1)
    expect((await request(app).get('/api/projects?q=fracture').set(h)).status).toBe(200)
    const detail = (await request(app).get(`/api/projects/${pid}`).set(h)).body
    expect(detail.analysis).toBeTruthy(); expect(detail.roadmap).toBeTruthy(); expect(detail.documentation).toBeTruthy(); expect(detail.architecture).toBeTruthy(); expect(detail.is_saved).toBe(true); expect(detail.is_favorite).toBe(true)

    const ids = [rec.projects[0].id, rec.projects[1].id, imp.improved.id]
    const cmp = (await request(app).post('/api/projects/compare').set(h).send({ project_ids: ids })).body.projects
    expect(cmp).toHaveLength(3); expect(cmp[0]).toHaveProperty('ai_complexity')
    expect((await request(app).post('/api/projects/compare').set(h).send({ project_ids: [ids[0]] })).status).toBe(422)
    expect((await request(app).post('/api/projects/compare').set(h).send({ project_ids: [ids[0], ids[0]] })).status).toBe(422)

    for (const [fmt, ct] of [['md', 'markdown'], ['html', 'html'], ['json', 'json']]) {
      const r = await request(app).get(`/api/projects/${pid}/export?format=${fmt}`).set(h)
      expect(r.status).toBe(200); expect(r.headers['content-type']).toContain(ct); expect(r.headers['content-disposition']).toContain('attachment')
    }
    const dash = (await request(app).get('/api/dashboard').set(h)).body
    expect(dash.counts.analyses).toBe(1); expect(dash.recent_analyses).toHaveLength(1); expect(dash.saved).toHaveLength(1); expect(dash.favorites).toHaveLength(1)

    expect((await request(app).delete(`/api/projects/${pid}`).set(h)).status).toBe(204)
    expect((await request(app).get(`/api/projects/${pid}`).set(h)).status).toBe(404)
    const { ProjectAnalysis, SimilarProject, Project } = await import('../src/models/index.js')
    expect(await ProjectAnalysis.countDocuments({ project_id: pid })).toBe(0)
    expect(await SimilarProject.countDocuments({ analysis_id: a.id })).toBe(0)
    expect((await Project.findById(imp.improved.id)).parent_id).toBeNull() // SQL ON DELETE SET NULL behaviour
  })

  test('projects are private; invalid ids are 404', async () => {
    const h1 = await register(), h2 = await register('Bob B')
    const pid = (await request(app).post('/api/projects/recommend').set(h1).send(PREFS)).body.projects[0].id
    expect((await request(app).get(`/api/projects/${pid}`).set(h2)).status).toBe(404)
    expect((await request(app).delete(`/api/projects/${pid}`).set(h2)).status).toBe(404)
    expect((await request(app).get('/api/projects/not-an-id').set(h1)).status).toBe(404)
  })

  test('free-text idea analysis, and graceful handling when no source is reachable', async () => {
    const h = await register()
    stub([])
    for (const k of Object.keys(PROVIDERS)) PROVIDERS[k] = [PROVIDERS[k][0], async () => { throw new SearchError('Network error: test') }]
    const r = await request(app).post('/api/projects/analyze').set(h).send({ idea_text: 'AI-based bone fracture detection using Vision Transformer' })
    expect(r.status).toBe(200)
    const a = r.body.analysis
    expect(a.novelty_score).toBeNull(); expect(a.confidence).toBe('none'); expect(a.summary.similarity_explanation).toMatch(/cannot be estimated/)
    expect(Object.values(a.sources_status).every((s) => s.ok === false && s.error)).toBe(true)
    expect((await request(app).post('/api/projects/analyze').set(h).send({})).status).toBe(422)
  })

  test('search endpoints: results are labelled verified; total failure is a 502 with reasons', async () => {
    const h = await register()
    stub(FAKE)
    const ok = await request(app).post('/api/search/github').set(h).send({ query: 'fracture detection' })
    expect(ok.status).toBe(200); expect(ok.body.verified).toBe(true); expect(ok.body.results[0].source).toBe('github')
    expect((await request(app).post('/api/search/papers').set(h).send({ query: 'fracture detection' })).body.results.length).toBe(2)
    for (const k of Object.keys(PROVIDERS)) PROVIDERS[k] = [PROVIDERS[k][0], async () => { throw new SearchError('Rate limited') }]
    const bad = await request(app).post('/api/search/github').set(h).send({ query: 'fracture detection' })
    expect(bad.status).toBe(502); expect(bad.body.detail).toMatch(/Rate limited/)
    expect((await request(app).post('/api/search/github').set(h).send({ query: 'x' })).status).toBe(422)
  })
})

describe('vector corpus lookup', () => {
  test('a second analysis finds sources stored by an earlier analysis (in-process fallback without Atlas)', async () => {
    const h = await register()
    stub(FAKE)
    await request(app).post('/api/projects/analyze').set(h).send({ idea_text: 'Fracture detection in x-ray images with deep learning' })
    stub([{ ...FAKE[1], url: 'https://example.test/other', title: 'Another fracture paper' }])
    const r = await request(app).post('/api/projects/analyze').set(h).send({ idea_text: 'Fracture detection in x-ray images with convolutional networks' })
    const m = r.body.analysis.summary.corpus_matches
    expect(m.length).toBeGreaterThan(0); expect(m[0]).toHaveProperty('similarity')
    expect(m.some((x) => x.url === 'https://example.test/paper1')).toBe(true)
    expect(r.body.analysis.summary.corpus_search).toBe('in_process_fallback')
  })
})
