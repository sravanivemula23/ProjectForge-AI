import { randomUUID } from 'node:crypto'
import { runStructured } from '../ai/runStructured.js'
import { RecommendationBatch, IdeaOut } from '../ai/schemas.js'
import { CATALOG } from '../ai/catalog.js'
import { scoreProject } from '../scoring/index.js'

const DIFF = { beginner: 0, intermediate: 1, advanced: 2 }

export function enrich(idea, prefs = {}) {
  const i = { ...idea }
  if (!i.career_relevance_note) i.career_relevance_note = `Builds portfolio evidence in ${(i.technologies || []).slice(0, 3).join(', ')} relevant to ${prefs.career_target || 'software roles'}.`
  if (!i.research_potential_note) i.research_potential_note = `${(i.innovation_opportunities || []).length} innovation angles could support a short paper or poster.`
  return i
}

export function relevance(idea, profile, prefs) {
  let r = 0
  const wanted = [prefs.domain, ...(profile.preferred_domains || [])].filter(Boolean).map((d) => d.toLowerCase())
  const dom = idea.domain.toLowerCase()
  if (wanted.some((w) => w && (dom.includes(w) || w.includes(dom)))) r += 50
  const text = `${idea.title} ${idea.short_description}`.toLowerCase()
  r += 5 * [...(profile.interests || []), ...(profile.research_interest || [])].filter((i) => text.includes(i.toLowerCase())).length
  const pref = new Set((prefs.preferred_technologies || []).map((t) => t.toLowerCase()))
  r += 4 * (idea.technologies || []).filter((t) => pref.has(t.toLowerCase())).length
  if (prefs.difficulty) r += 15 - 8 * Math.abs((DIFF[idea.difficulty] ?? 1) - (DIFF[prefs.difficulty] ?? 1))
  return r
}

const fallback = (profile, prefs, n) => ({ ideas: [...CATALOG].sort((a, b) => relevance(b, profile, prefs) - relevance(a, profile, prefs)).slice(0, Math.max(n, 5)).map((i) => ({ ...i })) })

export async function generate(profile, prefs, n = 6, userId = null) {
  const prompt =
    `Generate ${Math.max(n, 5)} distinct, realistic project ideas as JSON {"ideas": [...]}. Each idea has keys: title, short_description, problem_statement, target_users[], domain, ` +
    'difficulty(beginner|intermediate|advanced), estimated_weeks(int), required_skills[], technologies[], ai_ml_components[], modules[], expected_output, deployment_options[], ' +
    'estimated_cost_usd(number), hardware_required[], career_relevance_note, research_potential_note, innovation_opportunities[] (at least 3, concrete). Ideas must fit the student.\n' +
    `Student profile: ${JSON.stringify(profile)}\nPreferences: ${JSON.stringify(prefs)}`
  let { data, origin, error } = await runStructured('recommend', prompt, RecommendationBatch, () => fallback(profile, prefs, n), userId)
  let ideas = data.ideas.map((i) => IdeaOut.parse(i))
  if (ideas.length < 5) {
    for (const c of fallback(profile, prefs, 5).ideas) {
      if (ideas.length >= 5) break
      if (!ideas.some((i) => i.title === c.title)) { ideas.push(IdeaOut.parse(c)); origin = 'mixed' }
    }
  }
  const scored = ideas.map((raw) => {
    const idea = enrich(raw, prefs)
    const score = scoreProject(idea, profile, prefs)
    return { total: score.overall + 0.3 * relevance(idea, profile, prefs), idea, score }
  }).sort((a, b) => b.total - a.total)
  return { ranked: scored.map((s, k) => ({ idea: s.idea, score: s.score, rank: k + 1 })), origin, error }
}
export const newBatchId = () => randomUUID().replace(/-/g, '').slice(0, 12)
