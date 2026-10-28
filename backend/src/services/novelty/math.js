/** Novelty math (port of services/novelty.py). See README "Scoring methodology". */
import { round1 } from '../../utils/pyRound.js'

export const METHODOLOGY =
  'Estimated novelty = 100 - weighted similarity to retrieved sources (best match 50%, top-5 mean 30%, share of highly similar items 20%) + up to 10 points for concepts absent from every retrieved source; capped at 95. ' +
  'When few sources are retrieved (low/medium confidence) the estimate is pulled toward a neutral 50 so that missing evidence is never read as originality. ' +
  'This is an estimate based only on the sources that could be retrieved; it is not proof of uniqueness.'

export function conceptGap(concepts, corpus) {
  const text = corpus.join(' ').toLowerCase()
  const absent = concepts.filter((c) => !text.includes(c.toLowerCase()))
  return [concepts.length ? absent.length / concepts.length : 0, absent]
}

export function computeNovelty(sims, concepts, corpus, providersOk) {
  if (!sims.length) return { existing_similarity: null, novelty_score: null, confidence: 'none', absent_concepts: [], methodology: METHODOLOGY }
  const ranked = [...sims].sort((a, b) => b - a)
  const best = ranked[0]
  const top = ranked.slice(0, 5), top5 = top.reduce((s, x) => s + x, 0) / top.length
  const density = (ranked.filter((s) => s >= 60).length / ranked.length) * 100
  const similarity = 0.5 * best + 0.3 * top5 + 0.2 * density
  const [gap, absent] = conceptGap(concepts, corpus)
  let novelty = Math.max(0, Math.min(95, 100 - similarity + 10 * gap))
  const n = ranked.length
  const confidence = n >= 15 && providersOk >= 3 ? 'high' : n >= 6 && providersOk >= 2 ? 'medium' : 'low'
  const w = { low: 0.5, medium: 0.8, high: 1 }[confidence]
  novelty = w * novelty + (1 - w) * 50
  return { existing_similarity: round1(similarity), novelty_score: round1(novelty), confidence, absent_concepts: absent, methodology: METHODOLOGY }
}

export function explainSimilarity(result, topTitles) {
  if (result.novelty_score === null) return 'No external sources could be retrieved, so similarity cannot be estimated. Check your network/API configuration and re-run the analysis.'
  const sim = result.existing_similarity
  const level = sim >= 75 ? 'very close to' : sim >= 55 ? 'fairly similar to' : sim >= 35 ? 'partially overlapping with' : 'mostly different from'
  let text = `Your idea is ${level} what was found in the retrieved sources (estimated similarity ${sim}%, estimated novelty ${result.novelty_score}/100, confidence: ${result.confidence}).`
  if (topTitles.length) text += ` Closest matches: ${topTitles.slice(0, 3).join('; ')}.`
  if (result.absent_concepts.length) text += ` Concepts not found in any retrieved source: ${result.absent_concepts.slice(0, 5).join(', ')}.`
  if (result.confidence === 'low') text += ' Few sources were retrieved, so this estimate is pulled toward neutral and should be treated cautiously (configure more search providers or an embedding model for better evidence).'
  return text + ' This is an estimate, not a guarantee of uniqueness.'
}
