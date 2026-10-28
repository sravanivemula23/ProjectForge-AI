import { Schema, model, apiJson, ts } from './plugin.js'

const list = { type: [String], default: [] }

// SQL `users` + `profiles` (1:1) -> one document with an embedded profile.
const profileSchema = new Schema({
  education: { type: String, default: '' }, branch: { type: String, default: '' }, year: { type: String, default: '' },
  skills: list, programming_languages: list, frameworks: list, ai_ml_knowledge: list, database_knowledge: list, cloud_knowledge: list,
  interests: list, preferred_domains: list,
  career_goal: { type: String, default: '' },
  academic_requirement: { type: String, default: '' }, research_interest: list,
  experience_level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
}, { _id: false })

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  password_hash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  is_active: { type: Boolean, default: true },
  last_login_at: Date,
  profile: { type: profileSchema, default: () => ({}) },
}, ts)
apiJson(userSchema)
export const User = model('User', userSchema)
export const PROFILE_FIELDS = ['education', 'branch', 'year', 'skills', 'programming_languages', 'frameworks', 'ai_ml_knowledge', 'database_knowledge', 'cloud_knowledge', 'interests', 'preferred_domains', 'career_goal', 'experience_level']
