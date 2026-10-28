/**
 * Corpus-wide semantic search over embeddings stored from earlier analyses.
 *
 * - Atlas / mongodb-atlas-local: uses the `$vectorSearch` aggregation stage (cosine, 384-d).
 * - Anything else (plain MongoDB, in-memory, FerretDB): falls back to in-process cosine over a bounded candidate set.
 * Fresh search results (not yet stored) are always scored in-process - $vectorSearch can only query stored documents.
 */
import mongoose from 'mongoose'
import { env } from '../../config/env.js'
import { SimilarProject, ResearchPaper } from '../../models/index.js'
import { cosine, similarityPercent } from './index.js'

let vectorSupported // undefined = unknown, true/false after first attempt

const FALLBACK_CANDIDATES = 500

async function viaVectorSearch(Model, vector, limit, excludeAnalysisId) {
  const filter = excludeAnalysisId ? { analysis_id: { $ne: new mongoose.Types.ObjectId(excludeAnalysisId) } } : undefined
  const stage = { index: env.vectorIndexName, path: 'embedding', queryVector: vector, numCandidates: Math.max(50, limit * 20), limit }
  // `filter` needs the field declared as a "filter" field in the index; analysis_id is, see createVectorIndexes.js
  if (filter) stage.filter = filter
  const rows = await Model.aggregate([{ $vectorSearch: stage }, { $project: { source: 1, title: 1, url: 1, analysis_id: 1, score: { $meta: 'vectorSearchScore' } } }])
  return rows.map((r) => ({ ...r, cos: 2 * r.score - 1 })) // Atlas cosine score is (1+cos)/2
}

async function viaFallback(Model, vector, limit, excludeAnalysisId) {
  const q = excludeAnalysisId ? { analysis_id: { $ne: excludeAnalysisId } } : {}
  const docs = await Model.find(q).sort({ _id: -1 }).limit(FALLBACK_CANDIDATES).select('+embedding source title url analysis_id').lean()
  return docs.filter((d) => d.embedding?.length === vector.length).map((d) => ({ ...d, cos: cosine(vector, d.embedding) })).sort((a, b) => b.cos - a.cos).slice(0, limit)
}

export async function findRelatedInCorpus(vector, emb, { limit = 5, excludeAnalysisId = null, excludeUrls = [] } = {}) {
  const out = []
  let via = 'in_process_fallback'
  for (const [Model, kind] of [[SimilarProject, 'repo'], [ResearchPaper, 'paper']]) {
    let rows
    if (env.vectorSearch !== 'off' && vectorSupported !== false) {
      try { rows = await viaVectorSearch(Model, vector, limit, excludeAnalysisId); vectorSupported = true; via = 'mongodb_vector_search' }
      catch (err) { if (env.vectorSearch === 'on') throw err; vectorSupported = false; console.warn(`[vector] $vectorSearch unavailable (${err.codeName || err.message}); using in-process fallback`) }
    }
    rows ||= await viaFallback(Model, vector, limit, excludeAnalysisId)
    for (const r of rows) if (!excludeUrls.includes(r.url)) out.push({ kind, source: r.source, title: r.title, url: r.url, similarity: similarityPercent(r.cos, emb) })
  }
  return { via, matches: out.sort((a, b) => b.similarity - a.similarity).slice(0, limit) }
}

export const vectorSearchStatus = () => (vectorSupported === undefined ? 'unknown' : vectorSupported ? 'mongodb_vector_search' : 'in_process_fallback')
