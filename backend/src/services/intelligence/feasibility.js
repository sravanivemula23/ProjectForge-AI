import { env } from '../../config/env.js'
import { scoreProject, technicalComplexity, deploymentComplexity } from '../scoring/index.js'
import { projectText } from './text.js'

const DL = /cnn|transformer|deep|vision|lstm|bert|yolo|gan|segmentation|llm|diffusion|image/i
const API_RULES = [[/llm|gpt|openai|anthropic|chatbot|rag/i, 'LLM API (pay-per-use; optional with template fallback)'], [/github/i, 'GitHub REST API (free tier; token optional)'], [/payment|stripe|razorpay/i, 'Payment gateway (sandbox is free)'], [/map|geolocation|location/i, 'Maps / geolocation API'], [/sms|whatsapp|notification|email/i, 'Messaging / notification provider'], [/weather/i, 'Weather API']]
const costLevel = (usd) => (usd <= 50 ? 'Low' : usd <= 300 ? 'Medium' : 'High')

export function computeFeasibility(c, profile = {}, prefs = {}, research = null) {
  const sc = scoreProject({ ...c.data, title: c.title, short_description: c.short_description, domain: c.domain, difficulty: c.difficulty }, profile, prefs)
  const txt = projectText(c), team = Math.max(1, Number(prefs.team_size) || 1)
  const base = Number(c.estimated_weeks) || 12, eff = base / (1 + 0.6 * (team - 1))
  const lo = Math.max(1, Math.round(eff * 0.85)), hi = Math.max(lo + 1, Math.round(eff * 1.25))
  const d = sc.scores.difficulty
  const known = new Set(['skills', 'programming_languages', 'frameworks', 'ai_ml_knowledge', 'database_knowledge', 'cloud_knowledge'].flatMap((k) => (profile[k] || []).map((x) => String(x).toLowerCase())))
  const toLearn = c.required_skills.filter((s) => known.size && ![...known].some((k) => k.includes(String(s).toLowerCase()) || String(s).toLowerCase().includes(k)))
  const datasetNotes = (research?.papers || []).filter((p) => p.dataset?.text).slice(0, 3).map((p) => ({ text: p.dataset.text, paper: p.title, url: p.link }))
  const usd = Number(c.estimated_cost_usd) || 0, dep = deploymentComplexity({ ...c.data, hardware_required: c.hardware_required, deployment_options: c.deployment_options })
  const gpu = DL.test(txt) ? 'Recommended for training; free tiers (e.g. Colab/Kaggle) are usually enough for student-scale models' : 'Not required'
  return {
    score: sc.scores.feasibility, explanation: sc.explanations.feasibility, difficulty: d < 45 ? 'Easy' : d < 70 ? 'Medium' : 'Hard', difficultyScore: d,
    estimatedTime: { weeks: { min: lo, max: hi }, label: `${lo}-${hi} weeks`, teamSize: team, basis: `${base}-week solo estimate adjusted for a team of ${team}` },
    requiredSkills: c.required_skills, skillsToLearn: toLearn, hardware: { required: c.hardware_required, gpu }, 
    dataset: datasetNotes.length ? { availability: 'Datasets are referenced in retrieved papers (verify access and licence before use)', references: datasetNotes } : { availability: 'Information unavailable. Run research analysis, then verify public dataset availability yourself.', references: [] },
    apiDependencies: API_RULES.filter(([re]) => re.test(txt)).map(([, l]) => l), cloud: c.deployment_options.length ? c.deployment_options : ['Not specified'],
    cost: { usd, inr: Math.round(usd * env.inrPerUsd), level: costLevel(usd), note: 'Rough estimate from the project template/AI; verify current prices.' }, deploymentDifficulty: dep < 40 ? 'Low' : dep < 65 ? 'Medium' : 'High',
    technicalComplexity: technicalComplexity({ ...c.data, ai_ml_components: c.ai_ml_components, modules: c.modules, technologies: c.technologies }),
  }
}
