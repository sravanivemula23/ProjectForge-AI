/** Creates MongoDB Atlas Vector Search indexes (cosine, 384-d) for stored embeddings. Works on Atlas and `mongodb-atlas-local`.
 *  On plain MongoDB it logs a warning and the app uses the in-process similarity fallback. Safe to run repeatedly. */
import mongoose from 'mongoose'
import { env, EMBEDDING_DIM } from '../config/env.js'
import { SimilarProject, ResearchPaper } from '../models/index.js'

export async function ensureVectorIndexes() {
  if (env.vectorSearch === 'off') return { created: [], skipped: 'VECTOR_SEARCH=off' }
  const created = []
  for (const Model of [SimilarProject, ResearchPaper]) {
    const col = Model.collection
    try {
      await Model.createCollection().catch(() => {})
      const existing = await col.listSearchIndexes(env.vectorIndexName).toArray()
      if (existing.length) continue
      await col.createSearchIndex({
        name: env.vectorIndexName, type: 'vectorSearch',
        definition: { fields: [{ type: 'vector', path: 'embedding', numDimensions: EMBEDDING_DIM, similarity: 'cosine' }, { type: 'filter', path: 'analysis_id' }] },
      })
      created.push(col.collectionName)
    } catch (err) {
      console.warn(`[vector] could not create vector index on ${col.collectionName}: ${err.codeName || err.message}. Falling back to in-process similarity.`)
      return { created, error: err.message }
    }
  }
  return { created }
}

if (process.argv[1]?.endsWith('createVectorIndexes.js')) {
  const { connectDb, disconnectDb } = await import('../config/db.js')
  await connectDb()
  console.log(await ensureVectorIndexes())
  await disconnectDb()
}
