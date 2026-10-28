/** Novelty pipeline: concepts -> external retrieval -> embeddings -> cosine -> novelty estimate -> gaps -> corpus lookup. */
import { runSearch } from '../search/index.js'
import { getEmbedder, cosine, similarityPercent } from '../embeddings/index.js'
import { findRelatedInCorpus } from '../embeddings/vectorStore.js'
import { extractConcepts } from './analyzer.js'
import { computeNovelty, explainSimilarity } from './math.js'
import { findGaps } from '../ai/innovation.js'

export const DISCLAIMER = 'Estimated novelty is based only on sources retrieved from public APIs at analysis time. It is not proof that an idea is unique. ' +
  "Items under 'verified sources' come from external APIs; improvement suggestions are AI/template-generated."

export async function analyzeIdea(ideaText, domain = '', userId = null) {
  const { data: cdata, origin: cOrigin, error: cErr } = await extractConcepts(ideaText, domain, userId)
  const concepts = cdata.concepts
  const { items, status } = await runSearch(cdata.search_queries, { userId })

  const emb = await getEmbedder()
  const texts = items.map((it) => `${it.title}. ${it.description}`.slice(0, 1500))
  const [ideaVec, ...vecs] = await emb.embed([ideaText, ...texts])
  items.forEach((it, i) => { it.similarity = similarityPercent(cosine(ideaVec, vecs[i]), emb); it.embedding = vecs[i] })
  items.sort((a, b) => b.similarity - a.similarity)
  const top = items.slice(0, 25)

  const providersOk = Object.values(status).filter((s) => s.ok && s.count > 0).length
  const metrics = computeNovelty(top.map((i) => i.similarity), concepts, texts, providersOk)
  metrics.similarity_explanation = explainSimilarity(metrics, top.map((i) => i.title))

  const { data: gaps, origin: gOrigin, error: gErr } = await findGaps(ideaText, concepts, top, userId)
  const corpus = await findRelatedInCorpus(ideaVec, emb, { limit: 5, excludeUrls: top.map((i) => i.url) }).catch(() => ({ via: 'unavailable', matches: [] }))
  return {
    concepts, metrics, gaps, items: top, sources_status: status, embedding_backend: emb.name, ideaVector: ideaVec, corpus,
    suggestion_origin: cOrigin === gOrigin ? gOrigin : 'mixed', errors: [cErr, gErr].filter(Boolean), disclaimer: DISCLAIMER,
  }
}
