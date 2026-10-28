import { z } from 'zod'
import { ASPECTS, aspectContext, aspectPresentIn } from './aspects.js'
import { buildCorpus } from './corpus.js'
import { contentToks } from './text.js'
import { runStructured } from '../ai/runStructured.js'
import { list } from '../ai/schemas.js'

const DIFF_BASE = { Low: 4, Medium: 6, High: 8 }
export const DifferentiationOut = z.object({ suggestions: z.array(z.object({
  feature: z.string().min(3), why: z.string().min(5), technical_difficulty: z.preprocess((v) => { const s = String(v || 'Medium').toLowerCase(); return s.startsWith('l') ? 'Low' : s.startsWith('h') ? 'High' : 'Medium' }, z.enum(['Low', 'Medium', 'High'])),
})).min(3), notes: list.optional() })

/** Estimated originality gain: base points x evidence factor. Absent from all sources = full base; common = 40%; thin evidence = 50% and labelled so. */
export function estimateGain(base, presentCount, total) {
  if (total < 5) return { points: Math.round(base * 0.5), basis: `limited evidence (${total} retrieved sources), so the estimate is conservative` }
  const share = presentCount / total
  const f = presentCount === 0 ? 1 : share <= 0.2 ? 0.7 : 0.4
  return { points: Math.round(base * f), basis: presentCount === 0 ? `not mentioned in any of ${total} retrieved sources` : `mentioned in ${presentCount} of ${total} retrieved sources` }
}
const fromAspect = (a, corpus) => { const n = corpus.filter((it) => aspectPresentIn(a, it.text)).length; return { id: a.id, feature: a.feature, why: a.why, technical_difficulty: a.difficulty, expected_originality_improvement: estimateGain(a.gain, n, corpus.length), evidence: { mentionedIn: n, of: corpus.length }, origin: 'template' } }

export function templateSuggestions(c, corpus) {
  const ctx = aspectContext(c), own = `${c.title} ${c.short_description} ${c.modules.join(' ')} ${c.innovation_opportunities.join(' ')} ${c.technologies.join(' ')} ${c.ai_ml_components.join(' ')}`.toLowerCase()
  return ASPECTS.filter((a) => a.applies(ctx) && !aspectPresentIn(a, own)).map((a) => fromAspect(a, corpus)).sort((a, b) => b.expected_originality_improvement.points - a.expected_originality_improvement.points).slice(0, 8)
}

export async function generateDifferentiation(c, github, research, userId = null) {
  const corpus = buildCorpus(github, research), base = templateSuggestions(c, corpus)
  const prompt = 'The student wants to make this project more unique. Suggest 5-7 features that are RELEVANT to this specific project (do not add features that do not fit). Return JSON {"suggestions":[{feature, why, technical_difficulty: "Low"|"Medium"|"High"}]}. ' +
    `Project: ${JSON.stringify({ title: c.title, description: c.short_description, domain: c.domain, technologies: c.technologies, ai_ml: c.ai_ml_components, modules: c.modules })}\n` +
    `Candidate ideas already vetted for relevance: ${JSON.stringify(base.map((b) => b.feature))}\nRetrieved evidence titles: ${JSON.stringify(corpus.slice(0, 12).map((x) => x.title))}`
  const { data, origin, error } = await runStructured('differentiate', prompt, DifferentiationOut, () => ({ suggestions: base.map((b) => ({ feature: b.feature, why: b.why, technical_difficulty: b.technical_difficulty })) }), userId)
  if (origin === 'template') return { suggestions: base, origin, notice: error, note: 'Template suggestions, filtered for relevance to this project. Add AI_API_KEY for project-specific ideas.' }
  const suggestions = data.suggestions.map((s, i) => {
    const t = contentToks(s.feature), n = corpus.filter((it) => t.length && t.filter((x) => it.text.includes(x)).length >= Math.ceil(t.length * 0.6)).length
    return { id: `llm-${i}`, feature: s.feature, why: s.why, technical_difficulty: s.technical_difficulty, expected_originality_improvement: estimateGain(DIFF_BASE[s.technical_difficulty], n, corpus.length), evidence: { mentionedIn: n, of: corpus.length }, origin: 'llm' }
  })
  return { suggestions, origin, notice: null, note: 'AI-generated suggestions; originality gains are estimated from retrieved evidence.' }
}
