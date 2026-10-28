/** PROJECT NOVELTY SCORE (transparent; every number is derived from retrieved GitHub/paper evidence).
 *  github_uniqueness     = 100 - (0.5 best similarity + 0.3 mean top-5 + 0.2 share >=60) [archived/stale matches count 85%]; shrunk toward 50 with <8 repos
 *  research_uniqueness   = same on papers
 *  feature_uniqueness    = 100 * share of the project's features not found in any retrieved item
 *  technology_novelty    = 100 * (1 - mean prevalence of its distinctive technologies in retrieved items)
 *  market_differentiation= 100 - min(100, 18 * active similar repos + 12 * popular (>=100 stars) similar repos)
 *  overall               = weighted mean of the AVAILABLE components (github .30, feature .25, research .20, technology .15, market .10); capped at 95
 */
import { buildCorpus, mentions, featureFound, shrink, clampScore } from './corpus.js'

export const NOVELTY_WEIGHTS = { github_uniqueness: 0.3, feature_uniqueness: 0.25, research_uniqueness: 0.2, technology_novelty: 0.15, market_differentiation: 0.1 }
const COMMON_STACK = new Set(['react', 'node', 'node.js', 'express', 'mongodb', 'html', 'css', 'javascript', 'python', 'docker', 'tailwind', 'tailwind css', 'fastapi', 'postgresql', 'mysql', 'sql', 'typescript', 'flask', 'django', 'vite', 'react native', 'flutter', 'opencv', 'pandas', 'numpy', 'git', 'rest api', 'firebase'])
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1)
const unavailable = (why) => ({ score: null, explanation: `Information unavailable: ${why}`, evidence: [] })
const simScore = (sims, activeW) => { const r = sims.map((s, i) => s * (activeW?.[i] ?? 1)).sort((a, b) => b - a); return 0.5 * r[0] + 0.3 * mean(r.slice(0, 5)) + 0.2 * (100 * r.filter((s) => s >= 60).length / r.length) }

export function computeNoveltyBreakdown(c, github, research) {
  const repos = github?.repositories || [], papers = research?.papers || [], corpus = buildCorpus(github, research)
  const comps = {}
  const ghDown = !github || ['unavailable', 'rate_limited'].includes(github.status)
  if (ghDown) comps.github_uniqueness = unavailable('GitHub could not be queried.')
  else if (!repos.length) comps.github_uniqueness = { score: 90, explanation: 'No related repositories were found for any of the search strategies (limited evidence, so capped below 95).', evidence: [] }
  else {
    const raw = simScore(repos.map((r) => r.similarity), repos.map((r) => (r.activity === 'active' || r.activity === 'maintained' ? 1 : 0.85)))
    const closest = [...repos].sort((a, b) => b.similarity - a.similarity).slice(0, 3)
    comps.github_uniqueness = { score: clampScore(shrink(100 - raw, github.summary?.retrieved ?? repos.length)), explanation: `Closest repository is ${closest[0].fullName} at ${closest[0].similarity}% similarity; ${repos.filter((r) => r.similarity >= 60).length} of ${repos.length} retrieved repositories are highly similar.`,
      evidence: closest.map((r) => ({ title: r.fullName, url: r.url, similarity: r.similarity })) }
  }
  const rDown = !research || ['unavailable'].includes(research.status)
  if (rDown) comps.research_uniqueness = unavailable('research sources could not be queried.')
  else if (!papers.length) comps.research_uniqueness = { score: 88, explanation: 'No related papers were retrieved (limited evidence, so capped below 95).', evidence: [] }
  else {
    const raw = simScore(papers.map((p) => p.relevanceScore))
    const closest = [...papers].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3)
    comps.research_uniqueness = { score: clampScore(shrink(100 - raw, papers.length, 3, 6)), explanation: `Closest paper "${closest[0].title}" scores ${closest[0].relevanceScore}% similarity; ${papers.filter((p) => p.relevanceScore >= 60).length} of ${papers.length} retrieved papers are highly similar.`,
      evidence: closest.map((p) => ({ title: p.title, url: p.link, similarity: p.relevanceScore })) }
  }
  const features = [...new Set([...c.modules, ...c.innovation_opportunities])].slice(0, 10)
  if (!corpus.length || !features.length) comps.feature_uniqueness = unavailable(corpus.length ? 'the project lists no features.' : 'no retrieved sources to compare against.')
  else {
    const found = features.map((f) => ({ feature: f, item: corpus.find((it) => featureFound(it, f)) })).filter((x) => x.item)
    comps.feature_uniqueness = { score: clampScore(shrink(100 * (1 - found.length / features.length), corpus.length, 5, 12)), explanation: `${found.length} of ${features.length} planned features also appear in the retrieved sources${found.length ? ` (e.g. "${found[0].feature}")` : ''}.`,
      evidence: found.slice(0, 4).map((x) => ({ title: x.item.title, url: x.item.url, feature: x.feature })) }
  }
  const distinct = [...new Set([...c.ai_ml_components, ...c.technologies])].filter((t) => !COMMON_STACK.has(String(t).toLowerCase()))
  if (!corpus.length || !distinct.length) comps.technology_novelty = unavailable(distinct.length ? 'no retrieved sources to compare against.' : 'only common stack technologies are listed.')
  else {
    const prev = distinct.map((t) => ({ tech: t, p: corpus.filter((it) => mentions(it, t)).length / corpus.length }))
    comps.technology_novelty = { score: clampScore(shrink(100 * (1 - mean(prev.map((x) => x.p))), corpus.length, 5, 12)), explanation: `Distinctive technologies appear in ${Math.round(100 * mean(prev.map((x) => x.p)))}% of retrieved sources on average.`,
      evidence: prev.map((x) => ({ technology: x.tech, prevalence: Math.round(x.p * 100) })) }
  }
  if (ghDown) comps.market_differentiation = unavailable('GitHub could not be queried.')
  else {
    const sim = repos.filter((r) => r.similarity >= 50), active = sim.filter((r) => r.activity === 'active' || r.activity === 'maintained'), popular = sim.filter((r) => r.stars >= 100)
    const sat = Math.min(100, 18 * active.length + 12 * popular.length)
    comps.market_differentiation = { score: clampScore(100 - sat), explanation: `${active.length} actively maintained and ${popular.length} popular (100+ stars) similar repositories indicate ${sat >= 60 ? 'a crowded' : sat >= 25 ? 'a moderately crowded' : 'an open'} space.`, evidence: [] }
  }
  const avail = Object.entries(comps).filter(([, v]) => v.score != null)
  const wsum = avail.reduce((s, [k]) => s + NOVELTY_WEIGHTS[k], 0)
  const overall = wsum ? clampScore(avail.reduce((s, [k, v]) => s + v.score * NOVELTY_WEIGHTS[k], 0) / wsum) : null
  const confidence = !overall ? 'none' : avail.length >= 4 && repos.length >= 5 && papers.length >= 3 ? 'high' : avail.length >= 3 ? 'medium' : 'low'
  return { overall, components: comps, confidence, weights: NOVELTY_WEIGHTS, availableComponents: avail.length,
    methodology: 'Overall = weighted mean of available components (GitHub 30%, feature 25%, research 20%, technology 15%, market 10%). Each component is derived from retrieved evidence and pulled toward 50 when evidence is thin; capped at 95.',
    disclaimer: 'Estimated from the sources that could be retrieved. It is not proof that a project is unique.' }
}
