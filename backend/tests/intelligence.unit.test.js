import { describe, expect, test } from 'vitest'
import { buildGithubQueries } from '../src/services/github/queries.js'
import { prepareProject, scoreRepository } from '../src/services/github/relevance.js'
import { normalizeRepo, safeRepoUrl } from '../src/services/github/client.js'
import { projectContext } from '../src/services/intelligence/text.js'
import { extractFromAbstract } from '../src/services/research/extract.js'
import { analyzeResearchGap } from '../src/services/research/gap.js'
import { safePaperLink, scorePaper } from '../src/services/research/index.js'
import { computeNoveltyBreakdown, NOVELTY_WEIGHTS } from '../src/services/intelligence/novelty.js'
import { computeRealityCheck } from '../src/services/intelligence/reality.js'
import { templateSuggestions, estimateGain, generateDifferentiation } from '../src/services/intelligence/differentiation.js'
import { computeFeasibility } from '../src/services/intelligence/feasibility.js'
import { computeQuality, QUALITY_WEIGHTS } from '../src/services/intelligence/quality.js'
import { generateBlueprint, BlueprintOut } from '../src/services/intelligence/blueprint.js'
import { buildWeeklyPlan } from '../src/services/intelligence/weeklyPlan.js'
import { buildCorpus } from '../src/services/intelligence/corpus.js'
import { ghItem, GH_ITEMS } from './helpers.js'

const crop = projectContext({ title: 'AI Crop Disease Detection', short_description: 'Detects crop leaf diseases from photos and advises farmers', domain: 'Agriculture',
  difficulty: 'intermediate', data: { technologies: ['TensorFlow', 'React'], ai_ml_components: ['CNN', 'Image classification'], modules: ['Image upload', 'Disease classifier', 'Advisory engine'], innovation_opportunities: ['Offline inference'],
    required_skills: ['Python', 'React'], estimated_weeks: 12, estimated_cost_usd: 30, target_users: ['Farmers'], deployment_options: ['Cloud API'] } })
const NOW = Date.now(), iso = (d) => new Date(NOW - d * 864e5).toISOString()
const repo = (o) => { const r = normalizeRepo(ghItem(o)); return { ...r, ...scoreRepository(prepareProject(crop), r, NOW) } }

describe('GitHub query strategies', () => {
  test('uses several distinct, sanitised queries (not a single search)', () => {
    const qs = buildGithubQueries(crop)
    expect(qs.length).toBeGreaterThanOrEqual(4); expect(new Set(qs.map((q) => q.q)).size).toBe(qs.length)
    expect(qs.map((q) => q.strategy)).toEqual(expect.arrayContaining(['title', 'keywords', 'technology']))
    for (const q of qs) { expect(q.q.length).toBeLessThanOrEqual(200); expect(q.q).not.toMatch(/[:"()]|\bAND\b|\bOR\b/) }
  })
  test('adds an alternative-terminology query using synonyms', () => {
    const alt = buildGithubQueries(crop).find((q) => q.strategy === 'alternative')
    expect(alt.q).toMatch(/recognition|classification|identification|diagnosis/)
  })
  test('is deterministic', () => expect(buildGithubQueries(crop)).toEqual(buildGithubQueries(crop)))
})

describe('GitHub relevance ranking', () => {
  test('a matching repository outranks a generic one and an unrelated one', () => {
    const a = repo({}), b = repo({ name: 'random-ml-projects', full_name: 'o/random-ml-projects', description: 'Random machine learning notebooks', topics: ['machine-learning'], stargazers_count: 9000 })
    const c = repo({ name: 'resume-analyzer', full_name: 'o/resume-analyzer', description: 'AI resume analysis with NLP', topics: ['nlp'] })
    expect(a.relevanceScore).toBeGreaterThan(50); expect(b.relevanceScore).toBeLessThan(25); expect(c.relevanceScore).toBeLessThan(15)
    expect(a.relevanceScore).toBeGreaterThan(b.relevanceScore + 30)
  })
  test('popularity cannot rescue an unrelated repository', () => {
    const popular = repo({ name: 'awesome-lists', full_name: 'o/awesome-lists', description: 'Curated lists', topics: [], stargazers_count: 500000 })
    expect(popular.relevanceScore).toBeLessThan(10)
  })
  test('activity reflects archived/stale/active state and is deterministic', () => {
    expect(repo({ archived: true }).activity).toBe('archived'); expect(repo({ pushed_at: iso(900), updated_at: iso(900) }).activity).toBe('stale'); expect(repo({}).activity).toBe('active')
    expect(repo({})).toEqual(repo({}))
  })
  test('scores stay within 0-100', () => { const r = repo({}); expect(r.relevanceScore).toBeLessThanOrEqual(100); expect(r.similarity).toBeGreaterThanOrEqual(0) })
})

describe('GitHub normalisation and link safety (no fake links)', () => {
  test('only real https://github.com/owner/repo URLs survive', () => {
    expect(safeRepoUrl('https://github.com/a/b')).toBe('https://github.com/a/b'); expect(safeRepoUrl('https://github.com/a/b/')).toBe('https://github.com/a/b')
    for (const bad of ['http://github.com/a/b', 'https://evil.com/a/b', 'https://github.com.evil.com/a/b', 'javascript:alert(1)', 'https://github.com/a', '']) expect(safeRepoUrl(bad)).toBeNull()
    expect(normalizeRepo(ghItem({ html_url: 'https://evil.com/x/y' }))).toBeNull(); expect(normalizeRepo({ nonsense: true })).toBeNull(); expect(normalizeRepo(null)).toBeNull()
  })
  test('maps all requested fields', () => {
    const r = normalizeRepo(ghItem())
    expect(r).toMatchObject({ name: 'plant-disease-detection', fullName: 'octo/plant-disease-detection', owner: 'octo', stars: 120, forks: 30, language: 'Python', archived: false, license: 'MIT', defaultBranch: 'main' })
    expect(r.topics).toContain('cnn'); expect(r.createdAt).toBeTruthy(); expect(r.pushedAt).toBeTruthy(); expect(r.openIssues).toBe(3)
  })
})

describe('research extraction, links and gap analysis', () => {
  const abstract = 'We propose a CNN approach for leaf disease detection. We use a public leaf dataset of 5000 images. The model achieves 95% accuracy. However, it is limited to English labels. Future work will explore multilingual advice.'
  test('extracts verbatim sentences only; missing fields are null (never invented)', () => {
    const e = extractFromAbstract(abstract)
    expect(e.methodology.text).toMatch(/propose a CNN/); expect(e.dataset.text).toMatch(/dataset/); expect(e.mainResult.text).toMatch(/95%/); expect(e.limitations.text).toMatch(/limited/); expect(e.futureWork.text).toMatch(/Future work/)
    for (const f of ['methodology', 'dataset', 'mainResult', 'limitations', 'futureWork']) expect(abstract).toContain(e[f].text)
    const none = extractFromAbstract('')
    expect(none.hasAbstract).toBe(false); expect(none.methodology).toBeNull(); expect(none.dataset).toBeNull()
  })
  test('links: valid DOI -> doi.org, arXiv http upgraded, javascript: rejected', () => {
    expect(safePaperLink({ doi: '10.1234/abc.1' })).toEqual({ doi: '10.1234/abc.1', link: 'https://doi.org/10.1234/abc.1' })
    expect(safePaperLink({ url: 'http://arxiv.org/abs/1' }).link).toBe('https://arxiv.org/abs/1')
    expect(safePaperLink({ doi: 'not-a-doi', url: 'javascript:alert(1)' }).link).toBeNull()
  })
  test('paper relevance prefers on-topic papers', () => {
    expect(scorePaper(crop, { title: 'Plant disease detection with CNN', abstract: 'leaf disease classification' })).toBeGreaterThan(scorePaper(crop, { title: 'Cooking recipes corpus', abstract: 'recipes' }) + 25)
  })
  test('gap analysis reports gaps only from retrieved abstracts; none without evidence', () => {
    expect(analyzeResearchGap(crop, [], []).available).toBe(false)
    const papers = [{ title: 'CNN leaf disease', abstract: 'A CNN with grad-cam explainable maps for leaf disease.' }, { title: 'Crop classification', abstract: 'transfer learning on crop images' }]
    const g = analyzeResearchGap(crop, papers, [])
    expect(g.available).toBe(true); expect(g.existing.map((x) => x.aspect)).toContain('Explainable AI'); expect(g.gaps.map((x) => x.aspect)).not.toContain('Explainable AI')
    expect(g.gaps.length).toBeGreaterThan(0); expect(g.caveat).toMatch(/not proof/)
  })
})

const github = (repos, status = 'ok') => ({ status, repositories: repos, summary: { retrieved: repos.length }, totalAvailable: repos.length })
const research = (papers, status = 'ok') => ({ status, papers })
const manyRepos = (sim, n = 8, o = {}) => Array.from({ length: n }, (_, i) => ({ fullName: `o/r${i}`, name: `r${i}`, url: `https://github.com/o/r${i}`, similarity: sim, relevanceScore: sim, activity: 'active', stars: 10, description: `generic project ${i}`, topics: [], language: 'Python', ...o }))
const manyPapers = (sim, n = 6) => Array.from({ length: n }, (_, i) => ({ title: `Paper ${i}`, abstract: 'generic abstract', link: `https://doi.org/10.1/p${i}`, relevanceScore: sim }))

describe('novelty breakdown', () => {
  test('high similarity -> low novelty; low similarity -> high; both bounded and explained', () => {
    const low = computeNoveltyBreakdown(crop, github(manyRepos(90)), research(manyPapers(85)))
    const high = computeNoveltyBreakdown(crop, github(manyRepos(5)), research(manyPapers(5)))
    expect(low.overall).toBeLessThan(high.overall); expect(high.overall).toBeLessThanOrEqual(95); expect(low.overall).toBeGreaterThanOrEqual(0)
    for (const k of Object.keys(NOVELTY_WEIGHTS)) { expect(high.components[k]).toHaveProperty('explanation'); expect(high.components[k].explanation.length).toBeGreaterThan(10) }
    expect(high.components.github_uniqueness.evidence[0]).toHaveProperty('url')
    expect(Object.values(NOVELTY_WEIGHTS).reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10)
  })
  test('unavailable sources yield null components (never invented) and renormalised overall', () => {
    const r = computeNoveltyBreakdown(crop, github([], 'unavailable'), research([], 'unavailable'))
    expect(r.components.github_uniqueness.score).toBeNull(); expect(r.components.github_uniqueness.explanation).toMatch(/Information unavailable/)
    expect(r.components.research_uniqueness.score).toBeNull(); expect(r.overall).toBeNull(); expect(r.confidence).toBe('none')
    const partial = computeNoveltyBreakdown(crop, github(manyRepos(30)), research([], 'unavailable'))
    expect(partial.overall).not.toBeNull(); expect(partial.components.research_uniqueness.score).toBeNull()
  })
  test('thin evidence is pulled toward neutral', () => {
    const thin = computeNoveltyBreakdown(crop, github(manyRepos(0, 1)), research([], 'unavailable')).components.github_uniqueness.score
    const rich = computeNoveltyBreakdown(crop, github(manyRepos(0, 10)), research([], 'unavailable')).components.github_uniqueness.score
    expect(thin).toBeLessThan(rich)
  })
  test('feature uniqueness drops when the project features appear in retrieved sources', () => {
    const covered = computeNoveltyBreakdown(crop, github(manyRepos(40, 6, { description: 'image upload disease classifier advisory engine offline inference' })), research([]))
    const novel = computeNoveltyBreakdown(crop, github(manyRepos(40, 6)), research([]))
    expect(covered.components.feature_uniqueness.score).toBeLessThan(novel.components.feature_uniqueness.score)
  })
})

describe('reality check', () => {
  const sug = [{ feature: 'Explainable AI' }, { feature: 'Multilingual support' }, { feature: 'Edge deployment' }]
  test('red / yellow / green status from retrieved evidence', () => {
    expect(computeRealityCheck(crop, github(manyRepos(85, 3)), research([]), sug).status).toBe('red')
    expect(computeRealityCheck(crop, github(manyRepos(55, 2)), research([]), sug).status).toBe('yellow')
    const green = computeRealityCheck(crop, github(manyRepos(10, 6)), research(manyPapers(10)), sug)
    expect(green.status).toBe('green'); expect(green.recommendation).toMatch(/verify manually/)
  })
  test('red/yellow recommendation names concrete differentiators; counts and closest match come from data', () => {
    const r = computeRealityCheck(crop, github(manyRepos(60, 4)), research(manyPapers(20)), sug)
    expect(r.similarGithubCount).toBe(4); expect(r.closestMatch.url).toMatch(/^https:\/\/github\.com\//); expect(r.recommendation).toMatch(/Explainable AI/); expect(r.icon).toBeTruthy()
  })
  test('unknown when no source could be queried', () => {
    const r = computeRealityCheck(crop, github([], 'unavailable'), research([], 'unavailable'), [])
    expect(r.status).toBe('unknown'); expect(r.similarGithubCount).toBeNull()
  })
})

describe('differentiation engine', () => {
  test('suggestions are relevant to the project (no blind feature stuffing) and skip what the project already has', () => {
    const corpus = buildCorpus(github(manyRepos(40)), research([]))
    const s = templateSuggestions(crop, corpus).map((x) => x.feature.toLowerCase())
    expect(s.some((f) => f.includes('explainable'))).toBe(true); expect(s.some((f) => f.includes('edge') || f.includes('offline'))).toBe(false) // already lists "Offline inference"
    expect(s.some((f) => f.includes('federated'))).toBe(false) // crop images are not privacy-sensitive here
    const web = projectContext({ title: 'Expense Splitter Web App', short_description: 'Split group expenses', domain: 'FinTech', data: { technologies: ['React'], modules: ['Groups'] } })
    expect(templateSuggestions(web, []).some((x) => /explainable|multimodal|federated/i.test(x.feature))).toBe(false)
  })
  test('each suggestion explains why, difficulty and originality improvement with its basis', () => {
    const s = templateSuggestions(crop, buildCorpus(github(manyRepos(40)), research([])))[0]
    expect(s.why.length).toBeGreaterThan(10); expect(['Low', 'Medium', 'High']).toContain(s.technical_difficulty)
    expect(s.expected_originality_improvement.points).toBeGreaterThan(0); expect(s.expected_originality_improvement.basis).toMatch(/not mentioned|mentioned in|limited evidence/)
  })
  test('gain is larger when the aspect is absent from sources and conservative with thin evidence', () => {
    expect(estimateGain(8, 0, 10).points).toBeGreaterThan(estimateGain(8, 8, 10).points); expect(estimateGain(8, 0, 2).basis).toMatch(/limited evidence/)
  })
  test('template mode without an AI key labels its origin', async () => {
    const d = await generateDifferentiation(crop, github(manyRepos(40)), research([]))
    expect(d.origin).toBe('template'); expect(d.suggestions.length).toBeGreaterThan(2); expect(d.note).toMatch(/Template/)
  })
})

describe('feasibility, quality, blueprint, weekly plan', () => {
  const profile = { skills: ['Python', 'React'], programming_languages: ['Python'], frameworks: ['React'] }, prefs = { team_size: 3, time_weeks: 6, budget_usd: 50, career_target: 'ML engineer' }
  test('feasibility has the requested fields; datasets only from retrieved papers', () => {
    const f = computeFeasibility(crop, profile, prefs, { papers: [{ title: 'P', link: 'https://doi.org/10.1/x', dataset: { text: 'We use a public leaf dataset of 5000 images.' } }] })
    expect(f).toMatchObject({ difficulty: expect.stringMatching(/Easy|Medium|Hard/) }); expect(f.estimatedTime.weeks.max).toBeGreaterThan(f.estimatedTime.weeks.min)
    expect(f.hardware.gpu).toMatch(/Recommended/); expect(f.dataset.references[0].text).toMatch(/dataset/); expect(f.cost.level).toBe('Low'); expect(f.cost.inr).toBeGreaterThan(0)
    expect(computeFeasibility(crop, profile, prefs, null).dataset.availability).toMatch(/Information unavailable/)
  })
  test('ProjectForge score is a transparent weighted blend', () => {
    expect(Object.values(QUALITY_WEIGHTS).reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10)
    const nov = computeNoveltyBreakdown(crop, github(manyRepos(20)), research(manyPapers(20)))
    const q = computeQuality(crop, { profile, prefs, novelty: nov, feasibility: computeFeasibility(crop, profile, prefs, null), gap: { available: true, gaps: [1, 2] } })
    const expected = Math.round(Object.entries(QUALITY_WEIGHTS).reduce((s, [k, w]) => s + q.components[k].score * w, 0))
    expect(Math.abs(q.final - expected)).toBeLessThanOrEqual(1); expect(q.noveltyVerified).toBe(true); expect(q.formula).toMatch(/25% novelty/)
    expect(computeQuality(crop, { profile, prefs, novelty: null, feasibility: computeFeasibility(crop, profile, prefs, null) }).noveltyVerified).toBe(false)
  })
  test('blueprint covers all 22 sections; template mode; schema rejects incomplete AI output', async () => {
    const { data, origin } = await generateBlueprint(crop, { researchGaps: ['Explainable AI'], chosenFeatures: ['Explainable AI'] })
    expect(origin).toBe('template'); expect(BlueprintOut.safeParse(data).success).toBe(true)
    for (const k of ['title', 'one_line_idea', 'problem_statement', 'proposed_solution', 'objectives', 'target_users', 'key_features', 'unique_features', 'existing_system_limitations', 'proposed_system_advantages', 'architecture', 'technology_stack', 'frontend', 'backend', 'database', 'ai_ml_components', 'apis', 'dataset_requirements', 'security', 'testing', 'deployment', 'future_enhancements']) expect(data).toHaveProperty(k)
    expect(data.dataset_requirements.join(' ')).not.toMatch(/ImageNet|PlantVillage|Kaggle/i) // never invents dataset names
    expect(BlueprintOut.safeParse({ title: 'x' }).success).toBe(false)
  })
  test('weekly roadmap adapts to team size and ML weight', () => {
    const phases = Array.from({ length: 11 }, (_, i) => ({ number: i + 1, name: i === 6 ? 'AI/ML Model' : `Phase ${i + 1}`, tasks: ['t1', 't2'], expected_output: `out${i}`, estimated_weeks: 1 }))
    const solo = buildWeeklyPlan(phases, { teamSize: 1, hasML: true }), team = buildWeeklyPlan(phases, { teamSize: 4, hasML: true }), noML = buildWeeklyPlan(phases, { teamSize: 1, hasML: false })
    expect(team.totalWeeks).toBeLessThan(solo.totalWeeks); expect(solo.totalWeeks).toBeGreaterThanOrEqual(noML.totalWeeks)
    expect(solo.weeks.every((w) => w.focus.length > 0)).toBe(true); expect(team.notes.join(' ')).toMatch(/parallel/)
  })
})
