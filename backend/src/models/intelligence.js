import { Schema, model, apiJson, ts, ref } from './plugin.js'

const make = (name, def, opts = ts) => { const s = new Schema(def, opts); apiJson(s); return { s, m: model(name, s) } }

// Per-query cache of raw GitHub search results (shared between projects that produce the same query).
const gh = make('GitHubRepositoryCache', { query_hash: { type: String, required: true, unique: true }, query: String, items: [Schema.Types.Mixed], total_count: Number, fetched_at: { type: Date, default: Date.now }, expires_at: { type: Date, required: true } }, { minimize: false })
gh.s.index({ expires_at: 1 }, { expireAfterSeconds: 0 }) // MongoDB removes documents when expires_at passes (reads also check expires_at)
export const GitHubRepositoryCache = gh.m

const rp = make('ResearchPaperCache', { query_hash: { type: String, required: true, unique: true }, queries: [String], items: [Schema.Types.Mixed], sources_status: Schema.Types.Mixed, fetched_at: { type: Date, default: Date.now }, expires_at: { type: Date, required: true } }, { minimize: false })
rp.s.index({ expires_at: 1 }, { expireAfterSeconds: 0 })
export const ResearchPaperCache = rp.m

// One document per project holding the 2.0 intelligence sections (kept separate from the original ProjectAnalysis).
export const ProjectIntelligence = make('ProjectIntelligence', {
  project_id: ref('Project', { required: true, unique: true }), user_id: ref('User', { required: true, index: true }),
  github: Schema.Types.Mixed, research: Schema.Types.Mixed, novelty: Schema.Types.Mixed, reality_check: Schema.Types.Mixed,
  differentiation: Schema.Types.Mixed, quality: Schema.Types.Mixed, feasibility: Schema.Types.Mixed, blueprint: Schema.Types.Mixed,
}).m
