import { z } from 'zod'

const tags = z.preprocess((v) => {
  if (v == null) return []
  const a = typeof v === 'string' ? v.split(/[,\n]/) : v
  return Array.isArray(a) ? a.map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 40) : []
}, z.array(z.string()))
const level = z.enum(['beginner', 'intermediate', 'advanced'])
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id')

export const registerSchema = z.object({
  name: z.string().min(2).max(120).transform((s) => s.replace(/[<>]/g, '').trim()),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128).refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Password must contain letters and numbers'),
})
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) })
export const forgotSchema = z.object({ email: z.string().email() })
export const resetSchema = z.object({ token: z.string().min(10).max(200), password: z.string().min(8).max(128) })
export const userUpdateSchema = z.object({ name: z.string().min(2).max(120) })
export const profileSchema = z.object({
  education: z.string().max(160).default(''), branch: z.string().max(160).default(''), year: z.string().max(40).default(''),
  skills: tags, programming_languages: tags, frameworks: tags, ai_ml_knowledge: tags, database_knowledge: tags, cloud_knowledge: tags, interests: tags, preferred_domains: tags,
  career_goal: z.string().max(160).default(''), experience_level: level.default('beginner'),
  academic_requirement: z.string().max(60).default(''), research_interest: tags,
})
export const preferencesSchema = z.object({
  domain: z.string().max(80).default(''), difficulty: level.default('intermediate'), team_type: z.enum(['individual', 'team']).default('individual'),
  team_size: z.coerce.number().int().min(1).max(10).default(1), time_weeks: z.coerce.number().int().min(1).max(104).default(12),
  budget_usd: z.coerce.number().min(0).max(100000).default(50), budget_currency: z.enum(['USD', 'INR']).default('USD'), preferred_technologies: tags, skills_to_improve: tags,
  career_target: z.string().max(160).default(''), orientation: z.enum(['research', 'product']).default('product'),
  deployment_preference: z.string().max(60).default('cloud'), hardware_available: tags,
})
export const analyzeSchema = z.object({
  idea_text: z.string().min(10).max(3000).nullish(), title: z.string().max(300).nullish(), domain: z.string().max(80).default(''), project_id: objectId.nullish(),
})
export const projectIdSchema = z.object({ project_id: objectId })
export const compareSchema = z.object({ project_ids: z.array(objectId).min(2).max(3) })
export const searchSchema = z.object({ query: z.string().min(3).max(300), limit: z.coerce.number().int().min(1).max(20).default(8) })
export const adminUserSchema = z.object({ is_active: z.boolean().optional(), role: z.enum(['user', 'admin']).optional() })

// ---- 2.0 additions ----
export const githubQuerySchema = z.object({
  projectId: objectId, limit: z.coerce.number().int().min(1).max(20).default(8), refresh: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
})
export const progressSchema = z.object({ status: z.enum(['idea', 'researching', 'planning', 'building', 'testing', 'done']) })
export const intelRequestSchema = z.object({ project_id: objectId, refresh: z.boolean().optional() })
