import { toks, contentToks, hasPhrase } from './text.js'

/** Evidence corpus = retrieved repositories + papers (verified external data only). */
export function buildCorpus(github, research) {
  const repos = github?.repositories || [], papers = research?.papers || []
  return [
    ...repos.map((r) => ({ kind: 'repo', title: r.fullName, url: r.url, similarity: r.similarity, text: `${r.name} ${r.description} ${(r.topics || []).join(' ')} ${r.language || ''}`.toLowerCase().replace(/[-_]/g, ' ') })),
    ...papers.map((p) => ({ kind: 'paper', title: p.title, url: p.link, similarity: p.relevanceScore, text: `${p.title} ${p.abstract}`.toLowerCase().replace(/[-_]/g, ' ') })),
  ]
}
export const mentions = (item, phrase) => { const p = String(phrase).toLowerCase().replace(/[-_]/g, ' ').trim(); if (p.length < 2) return false; if (hasPhrase(item.text, p)) return true; const t = contentToks(p); return t.length > 0 && t.every((x) => item.text.includes(x)) }
export const featureFound = (item, feature) => { const t = contentToks(feature); if (!t.length) return false; const hit = t.filter((x) => item.text.includes(x)).length; return hit >= Math.max(1, Math.ceil(0.6 * t.length)) && t.length > 1 ? true : t.length === 1 && hit === 1 }
const WEIGHT_STEPS = (n, lo, hi) => (n >= hi ? 1 : n >= lo ? 0.8 : 0.5)
/** Pull a score toward neutral 50 when little evidence supports it. */
export const shrink = (score, n, lo = 3, hi = 8) => { const w = WEIGHT_STEPS(n, lo, hi); return w * score + (1 - w) * 50 }
export const clampScore = (x) => Math.max(0, Math.min(95, Math.round(x)))
