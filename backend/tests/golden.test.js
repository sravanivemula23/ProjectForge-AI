// Parity tests: outputs of the Python implementation (captured as fixtures) must be reproduced by the Node port.
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { HashingEmbedder } from '../src/services/embeddings/hashing.js'
import { cosine, similarityPercent } from '../src/services/embeddings/index.js'
import { scoreProject, technicalComplexity, deploymentComplexity } from '../src/services/scoring/index.js'
import { computeNovelty, explainSimilarity } from '../src/services/novelty/math.js'
import { heuristicConcepts, buildQueries } from '../src/services/novelty/analyzer.js'
import { CATALOG } from '../src/services/ai/catalog.js'

const G = JSON.parse(readFileSync(new URL('./fixtures/golden.json', import.meta.url), 'utf8'))
const prof = { skills: ['Python', 'React', 'SQL'], programming_languages: ['Python'], frameworks: ['FastAPI'], career_goal: 'ML engineer' }

describe('embeddings parity', () => {
  test('hashing vectors, cosines and calibrated similarity match Python', async () => {
    const e = new HashingEmbedder()
    const vecs = await e.embed(G.embed_texts)
    vecs.forEach((v, i) => v.slice(0, 8).forEach((x, j) => expect(x).toBeCloseTo(G.embed_first8[i][j], 9)))
    vecs.forEach((a, i) => vecs.forEach((b, j) => expect(cosine(a, b)).toBeCloseTo(G.cosines[i][j], 9)))
    vecs.forEach((v, i) => expect(similarityPercent(cosine(vecs[3], v), e)).toBeCloseTo(G.sim_pct[i], 1))
  })
})

describe('scoring parity', () => {
  test.each(G.scores.map((s) => [s.idx, s]))('catalog template %i', (_i, s) => {
    const r = scoreProject(CATALOG[s.idx], prof, s.prefs)
    expect(r.scores).toEqual(s.result.scores)
    expect(r.overall).toBe(s.result.overall)
    expect(r.novelty_verified).toBe(s.result.novelty_verified)
    expect(r.explanations).toEqual(s.result.explanations)
    expect(technicalComplexity(CATALOG[s.idx])).toBe(s.tc)
    expect(deploymentComplexity(CATALOG[s.idx])).toBe(s.dc)
  })
  test('verified novelty from analysis', () => {
    const prefs = { time_weeks: 12, team_size: 1, budget_usd: 50, orientation: 'product', career_target: 'ML engineer', skills_to_improve: ['Docker'], hardware_available: ['Webcam'] }
    const r = scoreProject(CATALOG[0], prof, prefs, { novelty_score: 71.3, existing_similarity: 40.2, confidence: 'medium' })
    expect(r.scores).toEqual(G.scores_with_analysis.scores)
    expect(r.explanations.novelty).toBe(G.scores_with_analysis.explanations.novelty)
  })
})

describe('novelty parity', () => {
  test.each(G.novelty.map((n, i) => [i, n]))('case %i', (_i, n) => {
    const r = computeNovelty(...n.args)
    expect(r.novelty_score).toEqual(n.result.novelty_score)
    expect(r.existing_similarity).toEqual(n.result.existing_similarity)
    expect(r.confidence).toBe(n.result.confidence)
    expect(r.absent_concepts).toEqual(n.result.absent_concepts)
    expect(explainSimilarity(r, ['A', 'B'])).toBe(n.explain)
  })
  test('concept extraction and query building', () => {
    for (const c of G.concepts) {
      const got = heuristicConcepts(c.text)
      expect(got).toEqual(c.concepts)
      expect(buildQueries(c.text, got)).toEqual(c.queries)
    }
  })
})
