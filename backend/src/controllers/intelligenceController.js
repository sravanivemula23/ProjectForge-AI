import { ProjectIntelligence, ProjectPreference, Project } from '../models/index.js'
import { owned } from './projectController.js'
import { profileOf } from './userController.js'
import { getGithubIntelligence } from '../services/github/index.js'
import { getResearchIntelligence } from '../services/research/index.js'
import { analyzeResearchGap } from '../services/research/gap.js'
import { projectContext } from '../services/intelligence/text.js'
import { computeNoveltyBreakdown } from '../services/intelligence/novelty.js'
import { computeRealityCheck } from '../services/intelligence/reality.js'
import { generateDifferentiation, templateSuggestions } from '../services/intelligence/differentiation.js'
import { buildCorpus } from '../services/intelligence/corpus.js'
import { computeFeasibility } from '../services/intelligence/feasibility.js'
import { computeQuality } from '../services/intelligence/quality.js'
import { generateBlueprint } from '../services/intelligence/blueprint.js'

const prefsOf = async (user) => (await ProjectPreference.findOne({ user_id: user._id }).sort({ _id: -1 }).lean()) || {}
const save = (project, user, patch) => ProjectIntelligence.findOneAndUpdate({ project_id: project._id }, { $set: patch, $setOnInsert: { user_id: user._id } }, { upsert: true, new: true }).lean()
const slim = (g) => ({ status: g.status, message: g.message, summary: g.summary, repositories: g.repositories, totalAvailable: g.totalAvailable, generatedAt: g.generatedAt })
const gather = async (req, project, refresh = false) => {
  const c = projectContext(project)
  const [github, research] = await Promise.all([getGithubIntelligence(c, { limit: 20, refresh, userId: req.user._id }), getResearchIntelligence(c, { limit: 15, refresh, userId: req.user._id })])
  return { c, github, research }
}

export async function githubRelated(req, res) {
  const { projectId, limit, refresh } = req.validQuery
  const project = await owned(req, projectId)
  const g = await getGithubIntelligence(projectContext(project), { limit, refresh, userId: req.user._id })
  if (g.status === 'ok' || g.status === 'partial') await save(project, req.user, { github: slim(g) }).catch(() => {})
  res.json({ repositories: g.repositories, status: g.status, message: g.message, retryable: g.retryable, totalAvailable: g.totalAvailable, cached: g.cached, queries: g.queries, summary: g.summary, tokenConfigured: g.tokenConfigured, generatedAt: g.generatedAt })
}

export async function githubAnalyze(req, res) {
  const { projectId, refresh } = req.validQuery
  const project = await owned(req, projectId)
  const g = await getGithubIntelligence(projectContext(project), { limit: 20, refresh, userId: req.user._id })
  const repos = g.repositories, by = (k) => repos.reduce((m, r) => ((m[r[k]] = (m[r[k]] || 0) + 1), m), {})
  res.json({ status: g.status, message: g.message, retryable: g.retryable, summary: g.summary, activity: by('activity'), licenses: repos.reduce((m, r) => ((m[r.license || 'none'] = (m[r.license || 'none'] || 0) + 1), m), {}),
    averageStars: repos.length ? Math.round(repos.reduce((s, r) => s + r.stars, 0) / repos.length) : null, queries: g.queries, generatedAt: g.generatedAt })
}

export async function researchRelated(req, res) {
  const { projectId, limit, refresh } = req.validQuery
  const project = await owned(req, projectId)
  const c = projectContext(project)
  const [r, g] = await Promise.all([getResearchIntelligence(c, { limit, refresh, userId: req.user._id }), getGithubIntelligence(c, { limit: 10, userId: req.user._id })])
  const gap = analyzeResearchGap(c, r.papers, g.repositories)
  if (r.status === 'ok' || r.status === 'partial') await save(project, req.user, { research: { status: r.status, papers: r.papers, gap, generatedAt: r.generatedAt } }).catch(() => {})
  res.json({ ...r, gap })
}

export async function novelty(req, res) {
  const project = await owned(req, req.body.project_id)
  const { c, github, research } = await gather(req, project, !!req.body.refresh)
  const gap = analyzeResearchGap(c, research.papers, github.repositories)
  const nov = computeNoveltyBreakdown(c, github, research)
  const prefs = await prefsOf(req.user), profile = profileOf(req.user)
  const feasibility = computeFeasibility(c, profile, prefs, research)
  const quality = computeQuality(c, { profile, prefs, novelty: nov, feasibility, gap })
  const reality = computeRealityCheck(c, github, research, templateSuggestions(c, buildCorpus(github, research)))
  const doc = await save(project, req.user, { github: slim(github), research: { status: research.status, papers: research.papers, gap, generatedAt: research.generatedAt }, novelty: nov, feasibility, quality, reality_check: reality })
  res.json({ project_id: String(project._id), novelty: nov, quality, feasibility, reality_check: reality, gap, github: { status: github.status, message: github.message, summary: github.summary }, research: { status: research.status, message: research.message }, updated_at: doc.updated_at })
}

export async function realityCheck(req, res) {
  const project = await owned(req, req.body.project_id)
  const { c, github, research } = await gather(req, project, !!req.body.refresh)
  const sug = templateSuggestions(c, buildCorpus(github, research))
  const reality = computeRealityCheck(c, github, research, sug)
  await save(project, req.user, { reality_check: reality, github: slim(github) })
  res.json({ project_id: String(project._id), reality_check: reality, github: { status: github.status, message: github.message }, research: { status: research.status, message: research.message } })
}

export async function differentiate(req, res) {
  const project = await owned(req, req.body.project_id)
  const { c, github, research } = await gather(req, project)
  const d = await generateDifferentiation(c, github, research, req.user._id)
  await save(project, req.user, { differentiation: { ...d, generatedAt: new Date().toISOString() } })
  res.json({ project_id: String(project._id), ...d })
}

export async function feasibility(req, res) {
  const project = await owned(req, req.body.project_id)
  const c = projectContext(project)
  const research = await getResearchIntelligence(c, { limit: 8, userId: req.user._id })
  const f = computeFeasibility(c, profileOf(req.user), await prefsOf(req.user), research)
  await save(project, req.user, { feasibility: f })
  res.json({ project_id: String(project._id), feasibility: f })
}

export async function blueprint(req, res) {
  const project = await owned(req, req.body.project_id)
  const c = projectContext(project)
  let intel = await ProjectIntelligence.findOne({ project_id: project._id }).lean()
  if (!intel?.research || !intel?.reality_check) { // build the evidence first so the blueprint is grounded
    const { github, research } = await gather(req, project)
    const gap = analyzeResearchGap(c, research.papers, github.repositories)
    const reality = computeRealityCheck(c, github, research, templateSuggestions(c, buildCorpus(github, research)))
    intel = { ...(intel || {}), research: { papers: research.papers, gap }, reality_check: reality }
  }
  const papers = intel.research?.papers || []
  const ctx = { researchGaps: (intel.research?.gap?.gaps || []).map((g) => g.aspect), commonFeatures: intel.reality_check?.commonFeatures || [], chosenFeatures: (intel.differentiation?.suggestions || []).slice(0, 4).map((s) => s.feature),
    datasetNotes: papers.filter((p) => p.dataset?.text).slice(0, 2).map((p) => `${p.dataset.text} (${p.title})`) }
  const { data, origin, error } = await generateBlueprint(c, ctx, req.user._id)
  await save(project, req.user, { blueprint: { ...data, origin, generatedAt: new Date().toISOString() } })
  res.json({ project_id: String(project._id), blueprint: data, origin, notice: error })
}

export async function analysis(req, res) {
  const project = await owned(req, req.params.id)
  const d = (await ProjectIntelligence.findOne({ project_id: project._id }).lean()) || {}
  res.json({ project_id: String(project._id), github: d.github || null, research: d.research || null, novelty: d.novelty || null, reality_check: d.reality_check || null, differentiation: d.differentiation || null,
    quality: d.quality || null, feasibility: d.feasibility || null, blueprint: d.blueprint || null, updated_at: d.updated_at || null })
}

export async function setProgress(req, res) {
  const project = await owned(req, req.params.id)
  project.progress = req.body.status
  await project.save()
  res.json({ id: String(project._id), progress: project.progress })
}
export { Project }
