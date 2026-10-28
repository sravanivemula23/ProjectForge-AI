/** zod schemas that validate every LLM response before it is stored (port of ai/schemas.py, incl. the same coercions). */
import { z } from 'zod'

const toList = (v) => {
  if (v == null) return []
  if (typeof v === 'string') return v.split(/[;\n]/).map((x) => x.trim()).filter(Boolean)
  if (Array.isArray(v)) return v.map(String).filter((x) => x.trim())
  return [String(v)]
}
export const list = z.preprocess(toList, z.array(z.string()))
const str = (d = '') => z.string().default(d)

export const IdeaOut = z.object({
  title: z.string().min(3).max(300), short_description: str(), problem_statement: str(), target_users: list, domain: str('General'),
  difficulty: z.preprocess((v) => { const s = String(v || 'intermediate').toLowerCase(); return ['beginner', 'intermediate', 'advanced'].includes(s) ? s : 'intermediate' }, z.enum(['beginner', 'intermediate', 'advanced'])),
  estimated_weeks: z.coerce.number().int().min(1).max(104).default(12), required_skills: list, technologies: list, ai_ml_components: list, modules: list,
  expected_output: str(), deployment_options: list, estimated_cost_usd: z.coerce.number().min(0).default(0), hardware_required: list,
  career_relevance_note: str(), research_potential_note: str(), innovation_opportunities: list,
})
export const RecommendationBatch = z.object({ ideas: z.array(IdeaOut).min(1) })
export const ConceptsOut = z.object({ concepts: list.pipe(z.array(z.string()).min(1)), domain: str(), problem: str(), techniques: list, search_queries: list })
const Improvement = z.object({ title: z.string(), category: str('feature'), rationale: str() })
export const GapsOut = z.object({
  common_features: list, missing_features: list, technical_limitations: list, research_gaps: list, improvements: z.array(Improvement).min(5),
  new_datasets: list, new_algorithms: list, new_user_groups: list, new_deployment_methods: list, new_integrations: list,
})
export const ImprovedOut = z.object({
  improved_title: z.string().min(3), improved_description: z.string().min(10), problem_statement: str(),
  added_features: z.array(z.object({ feature: z.string(), why: str() })).min(1), technologies: list, modules: list, ai_ml_components: list, innovation_opportunities: list,
  estimated_weeks: z.coerce.number().int().min(1).max(104).default(12),
})
const Phase = z.object({ number: z.coerce.number(), name: z.string(), tasks: list, expected_output: str(), technologies: list, estimated_weeks: z.coerce.number().min(0).default(1), dependencies: list })
export const RoadmapOut = z.object({ phases: z.array(Phase).min(11) })
export const ArchitectureOut = z.object({
  system_overview: str(), layers: z.array(z.object({ name: z.string(), components: list })).min(3), frontend: list, backend: list,
  database_tables: z.array(z.object({ name: z.string(), columns: list })).default([]), ai_pipeline: list,
  api_flow: z.array(z.object({ from: z.string(), to: z.string(), action: z.string() })).default([]),
})
export const DocumentationOut = z.object({
  title: z.string(), abstract: z.string(), introduction: str(), problem_statement: str(), existing_system: str(), proposed_system: str(), objectives: list,
  methodology: str(), architecture: str(), modules: list, technologies: list, advantages: list, limitations: list, future_scope: list, conclusion: str(),
  resume_description: str(), readme_md: str(), ppt_outline: list, viva_questions: z.array(z.object({ question: z.string(), answer: z.string() })).default([]), interview_explanation: str(),
})
