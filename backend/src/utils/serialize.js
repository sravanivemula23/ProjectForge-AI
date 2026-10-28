import { Document, Favorite, ProjectAnalysis, ProjectScore, Roadmap, SavedProject, SimilarProject, ResearchPaper } from '../models/index.js'

const id = (x) => String(x)

export const scoreOut = (s) => (s ? { scores: s.scores, explanations: s.explanations, overall: s.overall, novelty_verified: s.novelty_verified, methodology: s.methodology } : null)

export async function latestScores(projectIds) {
  const rows = await ProjectScore.find({ project_id: { $in: projectIds } }).sort({ _id: -1 }).lean()
  const map = new Map()
  for (const r of rows) if (!map.has(id(r.project_id))) map.set(id(r.project_id), r)
  return map
}

/** Batched serializer (avoids N+1 queries on list pages). */
export async function projectsOut(projects, userId, { detail = false } = {}) {
  const ids = projects.map((p) => p._id)
  const [scores, saved, favs] = await Promise.all([
    latestScores(ids),
    SavedProject.find({ user_id: userId, project_id: { $in: ids } }).select('project_id').lean(),
    Favorite.find({ user_id: userId, project_id: { $in: ids } }).select('project_id').lean(),
  ])
  const savedSet = new Set(saved.map((s) => id(s.project_id))), favSet = new Set(favs.map((s) => id(s.project_id)))
  const out = []
  for (const p of projects) {
    const o = {
      id: id(p._id), title: p.title, short_description: p.short_description, domain: p.domain, difficulty: p.difficulty, source: p.source, origin: p.origin, is_demo: p.is_demo,
      parent_id: p.parent_id ? id(p.parent_id) : null, version: p.version, progress: p.progress || 'idea', data: p.data, scores: scoreOut(scores.get(id(p._id))),
      is_saved: savedSet.has(id(p._id)), is_favorite: favSet.has(id(p._id)), created_at: p.created_at, updated_at: p.updated_at,
    }
    if (detail) {
      const [a, r, arch, doc] = await Promise.all([
        ProjectAnalysis.findOne({ project_id: p._id }).sort({ _id: -1 }),
        Roadmap.findOne({ project_id: p._id }).sort({ _id: -1 }).lean(),
        Document.findOne({ project_id: p._id, doc_type: 'architecture' }).sort({ _id: -1 }).lean(),
        Document.findOne({ project_id: p._id, doc_type: 'documentation' }).sort({ _id: -1 }).lean(),
      ])
      o.analysis = a ? await analysisOut(a) : null
      o.roadmap = r ? { data: r.data, origin: r.origin, created_at: r.created_at } : null
      o.architecture = arch ? { data: arch.content, origin: arch.origin } : null
      o.documentation = doc ? { data: doc.content, origin: doc.origin } : null
    }
    out.push(o)
  }
  return out
}
export const projectOut = async (p, userId, opts) => (await projectsOut([p], userId, opts))[0]

export async function analysisOut(a) {
  const [sims, papers] = await Promise.all([SimilarProject.find({ analysis_id: a._id }).sort({ similarity: -1 }).lean(), ResearchPaper.find({ analysis_id: a._id }).sort({ similarity: -1 }).lean()])
  return {
    id: id(a._id), project_id: id(a.project_id), idea_text: a.idea_text, concepts: a.concepts, existing_similarity: a.existing_similarity, novelty_score: a.novelty_score,
    confidence: a.confidence, summary: a.summary, sources_status: a.sources_status, embedding_backend: a.embedding_backend, suggestion_origin: a.suggestion_origin, created_at: a.created_at,
    similar_projects: sims.map((s) => ({ source: s.source, title: s.title, url: s.url, description: s.description, published: s.published_at, stars: s.extra?.stars ?? null, similarity: s.similarity, verified: true })),
    research_papers: papers.map((r) => ({ source: r.source, title: r.title, url: r.url, abstract: r.abstract, authors: r.authors, venue: r.venue, published: r.published_at, citations: r.citations, similarity: r.similarity, verified: true })),
    provenance: { verified_external: 'similar_projects, research_papers, existing_similarity, novelty_score', ai_generated: 'summary.improvements, summary.missing_features and other suggestions' },
  }
}

export const userOut = (u) => ({ id: id(u._id), name: u.name, email: u.email, role: u.role, created_at: u.created_at })
