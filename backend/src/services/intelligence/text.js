/** Deterministic text helpers shared by the GitHub / research relevance engines. */
import { tokenize } from '../embeddings/hashing.js'

const GENERIC = new Set(['on', 'of', 'to', 'in', 'at', 'by', 'is', 'it', 'or', 'an', 'for', 'and', 'with', 'based', 'using', 'system', 'platform', 'application', 'tool', 'framework', 'project', 'solution', 'smart', 'intelligent', 'powered', 'driven', 'web', 'app', 'software', 'ai-based', 'ai-powered'])

export const SYNONYMS = {
  detection: ['recognition', 'classification', 'identification', 'diagnosis'], recognition: ['detection', 'classification'], classification: ['detection', 'recognition'],
  analyzer: ['analysis', 'analytics', 'analyser'], analysis: ['analyzer', 'analytics'], recommendation: ['recommender', 'suggestion'], recommender: ['recommendation'],
  prediction: ['forecasting', 'predictive'], forecasting: ['prediction'], chatbot: ['conversational', 'assistant'], assistant: ['chatbot', 'copilot'],
  crop: ['plant', 'leaf', 'agriculture'], plant: ['crop', 'leaf'], farmer: ['agriculture', 'farming'], disease: ['pathology', 'diagnosis'], fracture: ['bone'],
  attendance: ['presence', 'roll-call'], resume: ['cv', 'curriculum'], career: ['job', 'employment'], student: ['learner', 'education'], learning: ['education', 'tutor'],
  health: ['medical', 'healthcare', 'clinical'], healthcare: ['medical', 'health', 'clinical'], medical: ['health', 'clinical'], security: ['cybersecurity', 'threat'],
  anomaly: ['outlier', 'intrusion'], sentiment: ['emotion', 'opinion'], ocr: ['text-recognition'], iot: ['sensor', 'embedded', 'arduino', 'esp32'],
  ai: ['machine-learning', 'deep-learning'], ml: ['machine-learning'], cnn: ['convolutional'], transformer: ['attention', 'bert', 'vit'],
}
const DOMAIN_TERMS = {
  healthcare: ['health', 'healthcare', 'medical', 'clinical', 'patient'], agriculture: ['agriculture', 'farm', 'crop', 'plant', 'soil'], education: ['education', 'student', 'learning', 'course', 'tutor'],
  fintech: ['finance', 'fintech', 'payment', 'bank', 'fraud'], cybersecurity: ['security', 'cybersecurity', 'threat', 'intrusion', 'malware'], iot: ['iot', 'sensor', 'embedded', 'arduino', 'esp32'],
  'computer vision': ['vision', 'image', 'opencv', 'detection'], nlp: ['nlp', 'language', 'text', 'sentiment'], robotics: ['robot', 'ros', 'arm'], blockchain: ['blockchain', 'ethereum', 'solidity', 'smart-contract'],
  sustainability: ['sustainability', 'carbon', 'emission', 'energy'], 'cloud computing': ['cloud', 'aws', 'serverless'], 'ai/ml': ['machine-learning', 'deep-learning', 'ai'], 'web development': ['web', 'react', 'node'], 'mobile development': ['mobile', 'android', 'ios', 'flutter'],
}

export function stem(t) {
  if (t.length > 5 && t.endsWith('ies')) return `${t.slice(0, -3)}y`
  if (t.length > 4 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is')) return t.slice(0, -1)
  return t
}
const pieces = (s) => String(s || '').toLowerCase().replace(/[\/_.]/g, ' ')
export const toks = (s) => tokenize(pieces(s)).flatMap((t) => t.split('-')).map(stem).filter((t) => t.length > 1)
export const contentToks = (s) => toks(s).filter((t) => !GENERIC.has(t))
export const set = (arr) => new Set(arr)
export const expand = (tokens) => { const out = new Set(tokens); for (const t of tokens) for (const s of SYNONYMS[t] || []) toks(s).forEach((x) => out.add(x)); return out }
export const domainTerms = (domain) => { const d = String(domain || '').toLowerCase(); return (DOMAIN_TERMS[d] || toks(d)).flatMap(toks) }

export const dice = (a, b) => (a.size && b.size ? (2 * [...a].filter((x) => b.has(x)).length) / (a.size + b.size) : 0)
export const cosineSets = (a, b) => (a.size && b.size ? [...a].filter((x) => b.has(x)).length / Math.sqrt(a.size * b.size) : 0)
export const coverage = (needles, hay, cap) => { const n = [...needles]; if (!n.length) return null; return Math.min(1, n.filter((x) => hay.has(x)).length / Math.min(n.length, cap ?? n.length)) }

/** Project fields used by the intelligence services, from a Project document. */
export function projectContext(p) {
  const d = p.data || {}
  return { id: String(p._id || p.id || ''), title: p.title, short_description: p.short_description || d.short_description || '', domain: p.domain || d.domain || '', difficulty: p.difficulty,
    technologies: d.technologies || [], ai_ml_components: d.ai_ml_components || [], modules: d.modules || [], innovation_opportunities: d.innovation_opportunities || [],
    target_users: d.target_users || [], required_skills: d.required_skills || [], problem_statement: d.problem_statement || '', estimated_weeks: d.estimated_weeks, estimated_cost_usd: d.estimated_cost_usd,
    hardware_required: d.hardware_required || [], deployment_options: d.deployment_options || [], expected_output: d.expected_output || '', data: d }
}
export const projectText = (c) => [c.title, c.short_description, c.problem_statement, ...c.technologies, ...c.ai_ml_components, ...c.modules, ...c.innovation_opportunities].join(' ').toLowerCase()

/** Top distinctive keywords of a project (title first), used for search queries and relevance. */
export function projectKeywords(c, n = 8) {
  const out = []
  const push = (t) => { if (t && !out.includes(t) && !GENERIC.has(t)) out.push(t) }
  contentToks(c.title).forEach(push)
  c.ai_ml_components.flatMap(contentToks).forEach(push)
  contentToks(c.short_description).slice(0, 10).forEach(push)
  c.technologies.flatMap(contentToks).forEach(push)
  return out.slice(0, n)
}
export const hasPhrase = (haystackLower, phrase) => { const p = String(phrase).toLowerCase().trim(); return p.length > 1 && haystackLower.includes(p) }
