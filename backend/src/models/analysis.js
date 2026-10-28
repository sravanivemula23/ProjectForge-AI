import { Schema, model, apiJson, ts, ref } from './plugin.js'

const embedding = { type: [Number], select: false } // 384-d; indexed by Atlas Vector Search (see scripts/createVectorIndexes.js)
const make = (name, def, opts = ts) => { const s = new Schema(def, opts); apiJson(s); return model(name, s) }

export const ProjectAnalysis = make('ProjectAnalysis', {
  project_id: ref('Project', { required: true, index: true }), user_id: ref('User', { required: true, index: true }),
  idea_text: String, concepts: { type: [String], default: [] },
  existing_similarity: { type: Number, default: null }, novelty_score: { type: Number, default: null },
  confidence: { type: String, default: 'none' }, summary: Schema.Types.Mixed, sources_status: Schema.Types.Mixed,
  embedding_backend: String, suggestion_origin: { type: String, default: 'template' },
})

// SQL `similar_projects` (repos) and `research_papers` stay separate; each holds embeddings and gets its own vector index.
export const SimilarProject = make('SimilarProject', {
  analysis_id: ref('ProjectAnalysis', { required: true, index: true }),
  source: String, title: String, url: { type: String, index: true }, description: { type: String, default: '' }, published_at: { type: String, default: '' },
  extra: Schema.Types.Mixed, similarity: { type: Number, default: 0 }, embedding,
}, { minimize: false })

export const ResearchPaper = make('ResearchPaper', {
  analysis_id: ref('ProjectAnalysis', { required: true, index: true }),
  source: String, title: String, url: { type: String, index: true }, abstract: { type: String, default: '' }, authors: { type: [String], default: [] },
  venue: { type: String, default: '' }, published_at: { type: String, default: '' }, citations: { type: Number, default: null },
  similarity: { type: Number, default: 0 }, embedding,
}, { minimize: false })
