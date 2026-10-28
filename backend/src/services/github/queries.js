import { SYNONYMS, contentToks, projectKeywords } from '../intelligence/text.js'

const clean = (q) => q.replace(/[^\w\s+.#-]/g, ' ').replace(/\b(AND|OR|NOT)\b/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)

/** Multiple complementary search strategies (never a single query). Deterministic. */
export function buildGithubQueries(c) {
  const titleTokens = contentToks(c.title)
  const kw = projectKeywords(c, 10)
  const descKw = contentToks(`${c.short_description} ${c.problem_statement}`).filter((t) => !titleTokens.includes(t)).slice(0, 5)
  const tech = [...c.ai_ml_components, ...c.technologies].flatMap(contentToks).filter((t, i, a) => a.indexOf(t) === i).slice(0, 3)
  const featureKw = c.modules.slice(0, 2).flatMap(contentToks).slice(0, 4)
  const domainKw = contentToks(c.domain).slice(0, 2)

  let alt = null
  const i = titleTokens.findLastIndex((t) => t !== 'ai' && SYNONYMS[t]?.length) // substitute the core noun (e.g. detection), not a generic word
  if (i >= 0) alt = titleTokens.map((t, j) => (j === i ? SYNONYMS[t][0] : t)).join(' ')

  const candidates = [
    ['title', titleTokens.slice(0, 7).join(' ')],
    ['keywords', kw.slice(0, 5).join(' ')],
    ['alternative', alt || ''],
    ['technology', [...kw.slice(0, 2), ...tech].join(' ')],
    ['features', [...kw.slice(0, 2), ...featureKw, ...domainKw].join(' ')],
    ['description', [...titleTokens.slice(0, 2), ...descKw.slice(0, 4)].join(' ')],
  ]
  const seen = new Set(), out = []
  for (const [strategy, raw] of candidates) {
    const q = clean(raw)
    if (q.length < 3 || seen.has(q.toLowerCase())) continue
    seen.add(q.toLowerCase())
    out.push({ strategy, q })
  }
  return out.slice(0, 5)
}
