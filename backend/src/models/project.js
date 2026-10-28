import { Schema, model, apiJson, ts, ref } from './plugin.js'

const list = { type: [String], default: [] }
const make = (name, def, opts = ts) => { const s = new Schema(def, opts); apiJson(s); return model(name, s) }

export const ProjectPreference = make('ProjectPreference', {
  user_id: ref('User', { required: true, index: true }),
  domain: { type: String, default: '' }, difficulty: { type: String, default: 'intermediate' },
  team_type: { type: String, default: 'individual' }, team_size: { type: Number, default: 1 }, time_weeks: { type: Number, default: 12 },
  budget_usd: { type: Number, default: 50 }, preferred_technologies: list, skills_to_improve: list, career_target: { type: String, default: '' },
  budget_amount: { type: Number, default: null }, budget_currency: { type: String, enum: ['USD', 'INR'], default: 'USD' },
  orientation: { type: String, default: 'product' }, deployment_preference: { type: String, default: 'cloud' }, hardware_available: list,
})

export const Project = make('Project', {
  user_id: ref('User', { required: true, index: true }),
  parent_id: ref('Project', { default: null }),
  title: { type: String, required: true }, short_description: { type: String, default: '' },
  domain: { type: String, default: 'General', index: true }, difficulty: { type: String, default: 'intermediate' },
  source: { type: String, enum: ['recommended', 'user_idea', 'improved', 'seed_demo'], default: 'recommended' }, // same values as the SQL version
  origin: { type: String, default: 'llm' }, // llm | template | user
  is_demo: { type: Boolean, default: false }, version: { type: Number, default: 1 },
  progress: { type: String, enum: ['idea', 'researching', 'planning', 'building', 'testing', 'done'], default: 'idea' },
  data: { type: Schema.Types.Mixed, default: {} },
})

export const ProjectRecommendation = make('ProjectRecommendation', {
  user_id: ref('User', { required: true, index: true }), preference_id: ref('ProjectPreference', { default: null }),
  project_id: ref('Project', { required: true }), batch: { type: String, index: true }, rank: Number,
})

export const ProjectScore = make('ProjectScore', {
  project_id: ref('Project', { required: true, index: true }), analysis_id: ref('ProjectAnalysis', { default: null }),
  scores: Schema.Types.Mixed, explanations: Schema.Types.Mixed, overall: Number, novelty_verified: { type: Boolean, default: false }, methodology: { type: String, default: 'v1' },
})

const link = { user_id: ref('User', { required: true, index: true }), project_id: ref('Project', { required: true, index: true }) }
const savedSchema = new Schema({ ...link, notes: { type: String, default: '' } }, ts)
savedSchema.index({ user_id: 1, project_id: 1 }, { unique: true }); apiJson(savedSchema)
export const SavedProject = model('SavedProject', savedSchema)
const favSchema = new Schema({ ...link }, ts)
favSchema.index({ user_id: 1, project_id: 1 }, { unique: true }); apiJson(favSchema)
export const Favorite = model('Favorite', favSchema)

export const Roadmap = make('Roadmap', { project_id: ref('Project', { required: true, index: true }), data: Schema.Types.Mixed, origin: { type: String, default: 'template' } })
export const Document = make('Document', {
  project_id: ref('Project', { required: true, index: true }), doc_type: { type: String, enum: ['documentation', 'architecture'], default: 'documentation' },
  content: Schema.Types.Mixed, origin: { type: String, default: 'template' },
})
