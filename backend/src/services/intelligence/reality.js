import { ASPECTS, aspectContext, aspectPresentIn } from './aspects.js'
import { buildCorpus } from './corpus.js'
import { tokenize } from '../embeddings/hashing.js'

const ICON = { green: '🟢', yellow: '🟡', red: '🔴', unknown: '⚪' }

/** PROJECT REALITY CHECK: does something similar already exist? Derived only from retrieved sources. */
export function computeRealityCheck(c, github, research, suggestions = []) {
  const repos = github?.repositories || [], papers = research?.papers || []
  const ghDown = !github || ['unavailable', 'rate_limited'].includes(github.status), rDown = !research || research.status === 'unavailable'
  if (ghDown && rDown) return { status: 'unknown', icon: ICON.unknown, label: 'Could not verify: GitHub and research sources are unavailable right now', recommendation: 'Retry shortly. Until then, the novelty of this idea is unverified.', similarGithubCount: null, retrievedGithubCount: null }
  const similar = repos.filter((r) => r.similarity >= 50), activeSimilar = similar.filter((r) => r.activity === 'active' || r.activity === 'maintained')
  const closest = [...repos].sort((a, b) => b.similarity - a.similarity)[0] || null
  const similarPapers = papers.filter((p) => p.relevanceScore >= 50), closestPaper = [...papers].sort((a, b) => b.relevanceScore - a.relevanceScore)[0] || null
  const top = Math.max(closest?.similarity || 0, closestPaper?.relevanceScore || 0)
  let status = 'green', label = 'No close match found among the retrieved sources'
  if (top >= 75 && (activeSimilar.length > 0 || similarPapers.length > 0)) { status = 'red'; label = 'Very similar projects already exist' }
  else if (top >= 45 || similar.length >= 3) { status = 'yellow'; label = 'Similar projects exist' }
  const corpus = buildCorpus(github, research), ctx = aspectContext(c), own = `${c.title} ${c.short_description} ${c.modules.join(' ')} ${c.innovation_opportunities.join(' ')}`.toLowerCase()
  const commonFeatures = ASPECTS.map((a) => ({ a, n: corpus.filter((it) => aspectPresentIn(a, it.text)).length })).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 5).map((x) => `${x.a.label} (${x.n} of ${corpus.length} sources)`)
  const freq = new Map(); const ownT = new Set(tokenize(own))
  for (const it of corpus.filter((x) => x.kind === 'repo').slice(0, 10)) for (const t of new Set(tokenize(it.text))) if (t.length > 4 && !ownT.has(t)) freq.set(t, (freq.get(t) || 0) + 1)
  const commonTerms = [...freq.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, n]) => `${t} (${n} repositories)`)
  const lessExplored = ASPECTS.filter((a) => a.applies(ctx) && !aspectPresentIn(a, own) && corpus.length >= 3 && !corpus.some((it) => aspectPresentIn(a, it.text))).slice(0, 5).map((a) => a.label)
  const pick = suggestions.slice(0, 3).map((s) => s.feature)
  const recommendation = status === 'green'
    ? `No close match was found among ${corpus.length} retrieved sources, but verify manually before committing.${pick.length ? ` To strengthen it further, consider: ${pick.join('; ')}.` : ''}`
    : `The core idea already appears in the retrieved sources.${pick.length ? ` Add ${pick.join('; ')} to differentiate it.` : ' Look for an underserved user group, dataset or deployment setting to differentiate it.'}`
  const n = similar.length
  return { status, icon: ICON[status], label, similarGithubCount: n, retrievedGithubCount: github?.summary?.retrieved ?? repos.length, activeSimilarCount: activeSimilar.length,
    closestMatch: closest ? { name: closest.fullName, url: closest.url, similarity: closest.similarity, activity: closest.activity } : null, similarPapersCount: similarPapers.length,
    closestPaper: closestPaper ? { title: closestPaper.title, url: closestPaper.link, similarity: closestPaper.relevanceScore } : null,
    technicalCommonness: n >= 6 ? 'Very common' : n >= 2 ? 'Moderately common' : 'Uncommon', commonFeatures, commonTerms, lessExplored, recommendation,
    methodology: 'Red: closest match >=75% and still maintained (or a very similar paper). Yellow: closest >=45% or 3+ similar repositories. Green: otherwise. "Similar" means >=50% similarity among retrieved results only.',
    caveat: github?.status === 'partial' || research?.status === 'partial' ? 'Some sources failed, so this check may be incomplete.' : null }
}
