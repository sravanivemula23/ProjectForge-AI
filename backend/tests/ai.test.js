import { afterEach, describe, expect, test, vi } from 'vitest'
import { GapsOut, RoadmapOut, RecommendationBatch, IdeaOut } from '../src/services/ai/schemas.js'
import { CATALOG } from '../src/services/ai/catalog.js'
import { extractJson } from '../src/services/ai/llmClient.js'
import { env } from '../src/config/env.js'
import { runStructured } from '../src/services/ai/runStructured.js'
import { generate } from '../src/services/recommendation/index.js'
import { generateRoadmap, generateArchitecture } from '../src/services/roadmap/index.js'
import { generateDocumentation, buildReferences } from '../src/services/documentation/index.js'
import { computeNovelty } from '../src/services/novelty/math.js'
import * as innovation from '../src/services/ai/innovation.js'

afterEach(() => { vi.unstubAllGlobals(); env.ai.apiKey = ''; env.ai.provider = 'none' })

describe('AI response validation', () => {
  test('rejects incomplete structures', () => {
    expect(GapsOut.safeParse({ improvements: [{ title: 'only one' }] }).success).toBe(false)
    expect(RoadmapOut.safeParse({ phases: [] }).success).toBe(false)
  })
  test('coerces lists and difficulty', () => {
    const r = IdeaOut.parse({ ...CATALOG[0], difficulty: 'HARD', target_users: 'a; b' })
    expect(r.difficulty).toBe('intermediate'); expect(r.target_users).toEqual(['a', 'b'])
  })
  test('extractJson handles fences and prose', () => {
    expect(extractJson('Here:\n```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(() => extractJson('no json')).toThrow()
  })
})

describe('runStructured', () => {
  test('uses fallback without a key (origin template)', async () => {
    const r = await runStructured('t', 'p', RecommendationBatch, () => ({ ideas: [CATALOG[0]] }))
    expect(r.origin).toBe('template'); expect(r.error).toBeNull()
  })
  const mockLLM = (payload) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: JSON.stringify(payload) }] }) })))
  test('accepts a valid LLM response', async () => {
    env.ai.apiKey = 'k'; env.ai.provider = 'anthropic'
    mockLLM({ ideas: [{ ...CATALOG[0], difficulty: 'beginner' }] })
    const r = await runStructured('t', 'p', RecommendationBatch, () => ({ ideas: [] }))
    expect(r.origin).toBe('llm'); expect(r.data.ideas[0].difficulty).toBe('beginner')
  })
  test('invalid LLM output falls back after one retry', async () => {
    env.ai.apiKey = 'k'; env.ai.provider = 'anthropic'
    mockLLM({ ideas: [] })
    const r = await runStructured('t', 'p', RecommendationBatch, () => ({ ideas: [CATALOG[1]] }))
    expect(r.origin).toBe('template'); expect(r.error).toMatch(/used built-in templates/)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  test('LLM HTTP failure falls back without throwing', async () => {
    env.ai.apiKey = 'k'; env.ai.provider = 'openai'
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })))
    const r = await runStructured('t', 'p', RecommendationBatch, () => ({ ideas: [CATALOG[1]] }))
    expect(r.origin).toBe('template'); expect(r.error).toMatch(/HTTP 500/)
  })
})

describe('engines (template mode)', () => {
  test('recommendations: >=5, ranked, domain-aware', async () => {
    const { ranked, origin } = await generate({ preferred_domains: ['Agriculture'], interests: [] }, { domain: 'Agriculture', difficulty: 'intermediate' })
    expect(ranked.length).toBeGreaterThanOrEqual(5); expect(origin).toBe('template')
    expect(ranked[0].idea.domain).toBe('Agriculture'); expect(ranked.map((r) => r.rank)).toEqual(ranked.map((_, i) => i + 1))
  })
  test('roadmap has 11 phases and total weeks; architecture has layers', async () => {
    const p = { title: 'T', data: CATALOG[0] }
    const rm = (await generateRoadmap(p)).data
    expect(rm.phases).toHaveLength(11); expect(rm.total_weeks).toBeGreaterThan(0)
    expect((await generateArchitecture(p)).data.layers.length).toBeGreaterThanOrEqual(3)
  })
  test('documentation references come only from retrieved sources', async () => {
    const src = [{ title: 'Real paper', source: 'arxiv', url: 'https://example.test/p', authors: ['A'], venue: 'arXiv', published: '2022' }]
    const doc = (await generateDocumentation({ title: 'T', data: CATALOG[0] }, null, src)).data
    expect(doc.references).toEqual(buildReferences(src)); expect(doc.references[0]).toContain('example.test'); expect(doc.viva_questions.length).toBeGreaterThan(0)
    expect((await generateDocumentation({ title: 'T', data: CATALOG[0] }, null, [])).data.references).toEqual([])
  })
  test('innovation fallback yields >=5 improvements; improve creates added features', async () => {
    const items = [{ source: 'github', title: 'fracture cnn', description: 'cnn xray classification with explainable grad-cam' }]
    const { data: gaps } = await innovation.findGaps('idea', ['cnn'], items)
    expect(gaps.improvements.length).toBeGreaterThanOrEqual(5)
    expect(gaps.missing_features.join(' ')).not.toMatch(/explainab/i) // already covered by retrieved sources
    expect(gaps.common_features.length).toBeGreaterThanOrEqual(0)
    const { data } = await innovation.improve({ title: 'Basic', data: { short_description: 'x', technologies: ['React'] } }, gaps)
    expect(data.added_features.length).toBeGreaterThan(0); expect(data.improved_title).not.toBe('Basic')
  })
  test('low evidence is shrunk toward neutral', () => {
    const r = computeNovelty([2.0], ['a'], ['zzz'], 1)
    expect(r.confidence).toBe('low'); expect(r.novelty_score).toBeGreaterThanOrEqual(50); expect(r.novelty_score).toBeLessThanOrEqual(75)
  })
})
