import { runSearch } from '../services/search/index.js'
import { getEmbedder, cosine, similarityPercent } from '../services/embeddings/index.js'
import { HttpError } from '../utils/httpError.js'

const run = (kind) => async (req, res) => {
  const { query, limit } = req.body
  const { items, status } = await runSearch([query], { kinds: [kind], limit, userId: req.user._id })
  if (!items.length && !Object.values(status).some((s) => s.ok)) throw new HttpError(502, `All search providers failed: ${Object.entries(status).map(([k, v]) => `${k}: ${v.error}`).join('; ')}`)
  const emb = await getEmbedder()
  const [q, ...vecs] = await emb.embed([query, ...items.map((i) => `${i.title}. ${i.description}`.slice(0, 1500))])
  items.forEach((it, i) => { it.similarity = similarityPercent(cosine(q, vecs[i]), emb) })
  items.sort((a, b) => b.similarity - a.similarity)
  res.json({ query, results: items, sources_status: status, embedding_backend: emb.name, verified: true })
}
export const github = run('repo')
export const papers = run('paper')
