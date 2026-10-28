/** Deterministic repository relevance scoring.
 * textScore  = weighted mean over applicable components (title .25, description .15, keyword .10, technology .12, domain .06, feature .10, topics .07)
 * popularity = (activity .07 + stars .04 + recency .04) / .15
 * relevance  = 100 * textScore * (0.85 + 0.15 * popularity)   -> popularity can nudge but never rescue an unrelated repository
 * similarity = 100 * textScore                                 -> "how close is this repo to the project idea"
 */
import { contentToks, cosineSets, dice, domainTerms, expand, projectKeywords, set, toks, hasPhrase } from '../intelligence/text.js'

export const WEIGHTS = { title: 0.25, description: 0.15, keyword: 0.1, technology: 0.12, domain: 0.06, feature: 0.1, topics: 0.07 }
const DAY = 86400000
const daysSince = (iso, now) => (iso ? Math.max(0, (now - new Date(iso).getTime()) / DAY) : Infinity)
const r = (x) => Math.round(x)

export function activityLevel(repo, now = Date.now()) {
  if (repo.archived) return 'archived'
  const d = daysSince(repo.pushedAt || repo.updatedAt, now)
  return d <= 180 ? 'active' : d <= 365 ? 'maintained' : 'stale'
}

export function prepareProject(c) {
  const keywords = projectKeywords(c, 8)
  return {
    c, keywords, kwSet: expand(keywords), titleSet: set(contentToks(c.title)), descSet: set(contentToks(`${c.title} ${c.short_description}`)),
    techPhrases: [...c.technologies, ...c.ai_ml_components].filter(Boolean), domainSet: set(domainTerms(c.domain)),
    featureSet: expand(c.modules.concat(c.innovation_opportunities).flatMap(contentToks)),
  }
}

export function scoreRepository(prep, repo, now = Date.now()) {
  const nameSet = set(contentToks(repo.name)), descToks = contentToks(`${repo.name} ${repo.description}`)
  const topics = (repo.topics || []).flatMap(toks)
  const hay = set([...descToks, ...topics, ...toks(repo.language)])
  const hayLower = `${repo.name} ${repo.description} ${(repo.topics || []).join(' ')} ${repo.language || ''}`.toLowerCase().replace(/[-_]/g, ' ')
  const comp = {
    title: dice(prep.titleSet, nameSet),
    description: cosineSets(prep.descSet, set(descToks)),
    keyword: 0, // computed below (synonym-aware)
    technology: prep.techPhrases.length ? Math.min(1, prep.techPhrases.filter((t) => hasPhrase(hayLower, t.replace(/[-_]/g, ' ')) || contentToks(t).every((x) => hay.has(x))).length / Math.min(prep.techPhrases.length, 3)) : null,
    domain: prep.domainSet.size ? ([...prep.domainSet].some((t) => hay.has(t)) ? 1 : 0) : null,
    feature: prep.featureSet.size ? Math.min(1, [...prep.featureSet].filter((t) => hay.has(t)).length / 3) : null,
    topics: Math.min(1, [...prep.kwSet].filter((t) => topics.includes(t)).length / 2),
  }
  // keyword coverage honours synonyms: a repo token that matches an expanded project keyword counts
  const kwHits = prep.keywords.filter((k) => hay.has(k) || [...expand([k])].some((x) => hay.has(x))).length
  comp.keyword = prep.keywords.length ? Math.min(1, kwHits / Math.min(prep.keywords.length, 5)) : 0
  let num = 0, den = 0
  for (const [k, w] of Object.entries(WEIGHTS)) if (comp[k] != null) { num += w * comp[k]; den += w }
  const textScore = den ? num / den : 0

  const d = daysSince(repo.pushedAt || repo.updatedAt, now)
  const activity = repo.archived ? 0.1 : d <= 90 ? 1 : d <= 365 ? 0.6 : d <= 730 ? 0.3 : 0.1
  const stars = Math.min(1, Math.log10((repo.stars || 0) + 1) / 4)
  const recency = d <= 30 ? 1 : d <= 180 ? 0.7 : d <= 365 ? 0.4 : 0.1
  const popularity = (0.07 * activity + 0.04 * stars + 0.04 * recency) / 0.15
  return {
    relevanceScore: Math.max(0, Math.min(100, r(100 * textScore * (0.85 + 0.15 * popularity)))),
    similarity: Math.max(0, Math.min(100, r(100 * textScore))),
    activity: activityLevel(repo, now),
    matchReasons: Object.entries(comp).filter(([, v]) => v != null && v >= 0.5).map(([k]) => k),
  }
}
