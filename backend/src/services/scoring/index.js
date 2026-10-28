/** Transparent scoring methodology v1 (port of services/scoring.py; formulas documented in README). */
import { pyRound, clamp100 } from '../../utils/pyRound.js'

export const METHOD_VERSION = 'v1'
const LEVEL_BASE = { beginner: 30, intermediate: 55, advanced: 80 }
const DOMAIN_MARKET = { 'ai/ml': 78, 'web development': 66, 'mobile development': 70, cybersecurity: 82, 'cloud computing': 72, iot: 68, blockchain: 58,
  'computer vision': 74, nlp: 76, healthcare: 80, agriculture: 68, education: 70, fintech: 80, sustainability: 70, robotics: 62 }
const HOT_TECH = ['llm', 'rag', 'transformer', 'pytorch', 'tensorflow', 'fastapi', 'react', 'docker', 'kubernetes', 'postgresql', 'pgvector', 'langchain',
  'vision transformer', 'mlops', 'aws', 'federated learning', 'next.js', 'typescript', 'gpt', 'embedding']
const CAREER_KEYWORDS = {
  ml: ['ml', 'pytorch', 'tensorflow', 'model', 'training', 'transformer', 'vision', 'nlp', 'mlops', 'embedding', 'llm'],
  data: ['data', 'pipeline', 'sql', 'etl', 'analytics', 'dashboard', 'spark', 'postgresql', 'visualization'],
  'full stack': ['react', 'fastapi', 'node', 'api', 'postgresql', 'docker', 'typescript', 'web', 'frontend', 'backend'],
  backend: ['api', 'fastapi', 'node', 'postgresql', 'docker', 'redis', 'microservice', 'backend'],
  frontend: ['react', 'typescript', 'tailwind', 'ui', 'frontend', 'next.js'],
  devops: ['docker', 'kubernetes', 'ci/cd', 'aws', 'terraform', 'monitoring', 'cloud'],
  cloud: ['aws', 'azure', 'gcp', 'cloud', 'docker', 'kubernetes', 'serverless'],
  security: ['security', 'threat', 'vulnerability', 'intrusion', 'encryption', 'anomaly', 'siem'],
  research: ['research', 'novel', 'benchmark', 'dataset', 'paper', 'evaluation', 'explainable'],
  mobile: ['android', 'ios', 'flutter', 'react native', 'mobile'],
  iot: ['iot', 'sensor', 'mqtt', 'esp32', 'embedded', 'edge'],
}
export const WEIGHTS = {
  product: { novelty: 0.2, feasibility: 0.2, career_relevance: 0.15, research_potential: 0.1, market_potential: 0.2, implementation: 0.15 },
  research: { novelty: 0.25, feasibility: 0.15, career_relevance: 0.1, research_potential: 0.25, market_potential: 0.05, implementation: 0.2 },
}
const norm = (s) => String(s).trim().toLowerCase()
const arr = (x) => (Array.isArray(x) ? x : [])
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0)

function knownSet(profile) {
  if (!profile) return new Set()
  return new Set(['skills', 'programming_languages', 'frameworks', 'ai_ml_knowledge', 'database_knowledge', 'cloud_knowledge'].flatMap((k) => arr(profile[k]).map(norm)))
}
export function skillCoverage(required, known) {
  const req = arr(required).map(norm).filter(Boolean)
  if (!req.length) return 1
  const hit = req.filter((r) => [...known].some((k) => k.includes(r) || r.includes(k))).length
  return hit / req.length
}
function ideaText(idea) {
  return [idea.title || '', idea.short_description || '', ...['technologies', 'ai_ml_components', 'modules', 'required_skills'].flatMap((k) => arr(idea[k]))].join(' ').toLowerCase()
}

export function scoreProject(idea, profile = {}, prefs = {}, analysis = null) {
  profile ||= {}; prefs ||= {}
  const ml = arr(idea.ai_ml_components), modules = arr(idea.modules), innov = arr(idea.innovation_opportunities), tech = arr(idea.technologies)
  const weeks = Math.max(1, parseInt(idea.estimated_weeks || 12, 10))
  const known = knownSet(profile)
  const ex = {}

  const cov = known.size ? skillCoverage(idea.required_skills, known) : 0.6
  const team = Math.max(1, parseInt(prefs.team_size || 1, 10))
  const avail = prefs.time_weeks
  const effWeeks = weeks / (1 + 0.6 * (team - 1))
  const timeFit = avail ? Math.min(1, avail / effWeeks) : 0.7
  const budget = prefs.budget_usd ?? null
  const cost = Number(idea.estimated_cost_usd || 0)
  const budgetFit = budget === null ? 0.8 : cost <= budget ? 1 : Math.max(0, 1 - (cost - budget) / Math.max(budget, 1))
  const hwReq = new Set(arr(idea.hardware_required).map(norm)), hwHave = new Set(arr(prefs.hardware_available).map(norm))
  const hardwareFit = !hwReq.size ? 1 : hwHave.size ? [...hwReq].filter((h) => hwHave.has(h)).length / hwReq.size : 0.4
  const teamFit = modules.length ? Math.min(1, (team * 4) / Math.max(1, modules.length)) : 1
  const feas = clamp100(100 * (0.4 * cov + 0.25 * timeFit + 0.15 * budgetFit + 0.1 * hardwareFit + 0.1 * teamFit))
  const pct = (x) => `${Math.round(x * 100)}%`
  ex.feasibility = `Skill coverage ${pct(cov)}, time fit ${pct(timeFit)} (${weeks} wk needed vs ${avail || 'unknown'} available, team ${team}), budget fit ${pct(budgetFit)}, hardware fit ${pct(hardwareFit)}, team workload fit ${pct(teamFit)}.`

  const diff = clamp100((LEVEL_BASE[idea.difficulty || 'intermediate'] ?? 55) + 3 * Math.min(ml.length, 4) + 1.5 * Math.max(0, modules.length - 5))
  ex.difficulty = `${idea.difficulty || 'intermediate'} base level + ${Math.min(ml.length, 4)} AI/ML components + ${modules.length} modules. Higher means harder.`

  const text = ideaText(idea)
  const hot = HOT_TECH.filter((h) => text.includes(h)).length
  const goal = norm(prefs.career_target || profile.career_goal || '')
  let hits = 0
  for (const [bucket, kws] of Object.entries(CAREER_KEYWORDS)) if (goal.includes(bucket)) hits = Math.max(hits, kws.filter((k) => text.includes(k)).length)
  const improve = arr(prefs.skills_to_improve).filter((s) => text.includes(norm(s))).length
  const career = clamp100(35 + Math.min(20, 4 * hot) + Math.min(30, 10 * hits) + Math.min(10, 5 * improve) + (arr(idea.deployment_options).length ? 5 : 0))
  ex.career_relevance = `${hot} in-demand technologies, ${hits} keywords matching career goal '${goal || 'unspecified'}', ${improve} skills-to-improve covered.`

  const research = clamp100(30 + 6 * Math.min(innov.length, 5) + 5 * Math.min(ml.length, 4) + (prefs.orientation === 'research' ? 15 : 0))
  ex.research_potential = `${innov.length} innovation angles, ${ml.length} AI/ML components, research orientation ${prefs.orientation === 'research' ? 'yes' : 'no'}.`

  const dom = norm(idea.domain || '')
  const deployable = ['cloud', 'saas', 'web', 'app', 'api'].some((w) => arr(idea.deployment_options).join(' ').toLowerCase().includes(w))
  const base = DOMAIN_MARKET[dom] ?? 65
  const market = clamp100(base + 3 * Math.min(arr(idea.target_users).length, 3) + (deployable ? 4 : 0) + (prefs.orientation === 'product' ? 5 : 0))
  ex.market_potential = `Domain baseline ${base}, ${arr(idea.target_users).length} target user groups, deployable product: ${deployable ? 'True' : 'False'}.`

  const stackFam = known.size ? skillCoverage(tech, known) : 0.6
  const moduleLoad = modules.length <= 6 ? 1 : 6 / modules.length
  const impl = clamp100(100 * (0.5 * stackFam + 0.3 * moduleLoad + 0.2 * timeFit))
  ex.implementation = `Familiarity with the stack ${pct(stackFam)}, module load ${pct(moduleLoad)}, time fit ${pct(timeFit)}.`

  const verified = !!(analysis && analysis.novelty_score != null)
  let novelty
  if (verified) { novelty = clamp100(analysis.novelty_score); ex.novelty = `Verified against retrieved sources: estimated similarity ${analysis.existing_similarity}%, confidence ${analysis.confidence}.` }
  else { novelty = clamp100(Math.min(85, 40 + 7 * Math.min(innov.length, 5) + 3 * Math.min(ml.length, 3))); ex.novelty = `UNVERIFIED prior from ${innov.length} innovation angles and ${ml.length} AI components. Run a novelty analysis against external sources.` }

  const scores = { novelty, feasibility: feas, difficulty: diff, career_relevance: career, research_potential: research, market_potential: market, implementation: impl }
  const w = WEIGHTS[prefs.orientation === 'research' ? 'research' : 'product']
  const overall = clamp100(sum(Object.entries(w), ([k, v]) => scores[k] * v))
  return { scores, explanations: ex, overall, novelty_verified: verified, methodology: METHOD_VERSION, weights: w }
}

export const technicalComplexity = (idea) => clamp100(25 + 10 * Math.min(arr(idea.ai_ml_components).length, 4) + 3 * Math.min(arr(idea.modules).length, 8) + 2 * Math.min(arr(idea.technologies).length, 8))
export function deploymentComplexity(idea) {
  const dep = arr(idea.deployment_options).join(' ').toLowerCase()
  return clamp100(25 + (dep.includes('kubernetes') ? 20 : 0) + (dep.includes('edge') || dep.includes('device') ? 10 : 0) + (dep.includes('cloud') || dep.includes('aws') ? 10 : 0) + 10 * arr(idea.hardware_required).length)
}
export { pyRound }
