import { runStructured } from '../ai/runStructured.js'
import { ConceptsOut } from '../ai/schemas.js'
import { tokenize } from '../embeddings/hashing.js'

const TECH_VOCAB = ['vision transformer', 'transformer', 'cnn', 'grad-cam', 'explainable ai', 'federated learning', 'reinforcement learning', 'llm', 'rag', 'gan', 'lstm', 'yolo', 'bert',
  'face recognition', 'object detection', 'segmentation', 'x-ray', 'mri', 'blockchain', 'iot', 'edge', 'anomaly detection', 'recommendation', 'chatbot', 'ocr', 'time series', 'nlp', 'fraud',
  'attendance', 'fracture', 'crop', 'disease', 'mobile', 'real-time', 'knowledge graph', 'embedding']

const mostCommon = (counter, n) => [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0])
export function heuristicConcepts(text, limit = 8) {
  const low = text.toLowerCase()
  const found = TECH_VOCAB.filter((t) => low.includes(t))
  const toks = tokenize(text)
  const big = new Map(), uni = new Map()
  toks.slice(0, -1).forEach((a, i) => { const b = `${a} ${toks[i + 1]}`; big.set(b, (big.get(b) || 0) + 1) })
  toks.filter((t) => t.length > 3).forEach((t) => uni.set(t, (uni.get(t) || 0) + 1))
  const out = []
  for (const c of [...found, ...mostCommon(big, 4), ...mostCommon(uni, 8)]) {
    if (!out.includes(c) && !out.some((o) => o !== c && o.includes(c))) out.push(c)
  }
  return out.slice(0, limit).length ? out.slice(0, limit) : [text.trim().slice(0, 60)]
}
export function buildQueries(text, concepts) {
  const short = text.replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 10).join(' ')
  return [...new Set([short, concepts.slice(0, 4).join(' ')])].filter(Boolean)
}
export async function extractConcepts(text, domain = '', userId = null) {
  const prompt = 'Extract key concepts from this project idea. Return JSON {"concepts": [5-8 short lowercase noun phrases], "domain": str, "problem": str, "techniques": [str], "search_queries": [2 concise search queries for GitHub/paper search]}.\n' +
    `Idea: ${text}\nDomain hint: ${domain}`
  const fb = () => { const c = heuristicConcepts(text); return { concepts: c, domain, problem: '', techniques: c.filter((x) => TECH_VOCAB.includes(x)), search_queries: buildQueries(text, c) } }
  const res = await runStructured('extract_concepts', prompt, ConceptsOut, fb, userId)
  if (!res.data.search_queries?.length) res.data.search_queries = buildQueries(text, res.data.concepts)
  return res
}
