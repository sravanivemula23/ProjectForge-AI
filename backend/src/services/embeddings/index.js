import { env } from '../../config/env.js'
import { HashingEmbedder } from './hashing.js'

/** Optional real semantic embeddings via Transformers.js (same MiniLM family as the Python version, 384-d).
 *  Install with `npm i @xenova/transformers` and set EMBEDDING_BACKEND=transformers. */
class TransformersEmbedder {
  lo = 0.25
  hi = 0.85
  constructor(model) { this.model = model; this.name = `transformers.js:${model}`; this.pipe = null }
  async embed(texts) {
    if (!this.pipe) { const { pipeline } = await import('@xenova/transformers'); this.pipe = await pipeline('feature-extraction', this.model) }
    const out = []
    for (const t of texts) out.push(Array.from((await this.pipe(t, { pooling: 'mean', normalize: true })).data))
    return out
  }
}

let cached
export async function getEmbedder() {
  if (cached) return cached
  if (env.embeddingBackend === 'transformers') {
    try { const e = new TransformersEmbedder(env.embeddingModel); await e.embed(['warmup']); return (cached = e) }
    catch (err) { console.warn(`[embeddings] transformers backend unavailable (${err.message}); using hashing fallback`) }
  }
  return (cached = new HashingEmbedder())
}
export const resetEmbedder = () => { cached = undefined }

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return dot / ((Math.sqrt(na) || 1) * (Math.sqrt(nb) || 1))
}

/** Calibrate raw cosine into 0-100 "closeness" for the active backend. */
export function similarityPercent(cos, emb) {
  const v = Math.max(0, Math.min(100, ((cos - emb.lo) / (emb.hi - emb.lo)) * 100))
  return Math.round(v * 10) / 10
}
