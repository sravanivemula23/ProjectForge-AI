import { Project, SavedProject, Favorite, ProjectAnalysis, UsageLog, ProjectIntelligence } from '../models/index.js'
import { projectsOut } from '../utils/serialize.js'
import { profileCompletion } from './userController.js'

export async function dashboard(req, res) {
  const uid = req.user._id
  const plist = async (q) => projectsOut(await Project.find(q).sort({ updated_at: -1 }).limit(6), uid)
  const ids = async (M) => (await M.find({ user_id: uid }).select('project_id').lean()).map((x) => x.project_id)
  const since = new Date(Date.now() - 30 * 86400000)
  const [recommended, saved, favorites, analyses, aiCalls, aiOk, nProjects, nSaved, nAnalyses] = await Promise.all([
    plist({ user_id: uid, source: { $in: ['recommended', 'seed_demo'] } }),
    ids(SavedProject).then((i) => plist({ user_id: uid, _id: { $in: i } })),
    ids(Favorite).then((i) => plist({ user_id: uid, _id: { $in: i } })),
    ProjectAnalysis.find({ user_id: uid }).sort({ _id: -1 }).limit(5).lean(),
    UsageLog.countDocuments({ user_id: uid, kind: 'ai', created_at: { $gte: since } }),
    UsageLog.countDocuments({ user_id: uid, kind: 'ai', success: true, created_at: { $gte: since } }),
    Project.countDocuments({ user_id: uid }), SavedProject.countDocuments({ user_id: uid }), ProjectAnalysis.countDocuments({ user_id: uid }),
  ])
  const titles = new Map((await Project.find({ _id: { $in: analyses.map((a) => a.project_id) } }).select('title').lean()).map((p) => [String(p._id), p.title]))
  const intel = await ProjectIntelligence.find({ user_id: uid }).sort({ updated_at: -1 }).limit(6).lean()
  const iProjects = new Map((await Project.find({ _id: { $in: intel.map((i) => i.project_id) } }).select('title progress').lean()).map((p) => [String(p._id), p]))
  const progressRows = await Project.find({ user_id: uid, source: { $ne: 'seed_demo' } }).select('progress').lean()
  const progress_counts = progressRows.reduce((m, p) => ((m[p.progress || 'idea'] = (m[p.progress || 'idea'] || 0) + 1), m), {})
  res.json({
    intelligence: intel.map((i) => ({ project_id: String(i.project_id), title: iProjects.get(String(i.project_id))?.title || '', progress: iProjects.get(String(i.project_id))?.progress || 'idea',
      novelty: i.novelty?.overall ?? null, quality: i.quality?.final ?? null, reality_status: i.reality_check?.status ?? null, github_similar: i.github?.summary?.similarCount ?? null,
      papers: i.research?.papers?.length ?? null, has_blueprint: !!i.blueprint, updated_at: i.updated_at })),
    progress_counts,
    profile_completion: profileCompletion(req.user), recommended, saved, favorites,
    recent_analyses: analyses.map((a) => ({ id: String(a._id), project_id: String(a.project_id), title: titles.get(String(a.project_id)) || '', novelty_score: a.novelty_score, existing_similarity: a.existing_similarity, confidence: a.confidence, created_at: a.created_at })),
    ai_usage: { calls_30d: aiCalls, successful: aiOk }, counts: { projects: nProjects, saved: nSaved, analyses: nAnalyses },
  })
}
