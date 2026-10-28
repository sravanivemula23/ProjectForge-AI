import { User, Project, ProjectPreference, SavedProject, UsageLog } from '../models/index.js'
import { HttpError } from '../utils/httpError.js'

async function usage(kind) {
  // Grouped by (name, success) and merged in JS: avoids $cond so it also runs on MongoDB-compatible servers.
  const rows = await UsageLog.aggregate([{ $match: { kind } }, { $group: { _id: { name: '$name', success: '$success' }, calls: { $sum: 1 }, latency: { $sum: '$latency_ms' } } }])
  const by = new Map()
  for (const r of rows) {
    const e = by.get(r._id.name) || { name: r._id.name, calls: 0, success: 0, total: 0 }
    e.calls += r.calls; e.total += r.latency || 0; if (r._id.success) e.success += r.calls
    by.set(r._id.name, e)
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name)).map((e) => ({ name: e.name, calls: e.calls, success: e.success, avg_latency_ms: Math.round(e.total / e.calls) }))
}
const groupCount = async (Model, field) =>
  (await Model.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }])).map((r) => ({ domain: r._id || 'Unspecified', count: r.count }))

export async function stats(_req, res) {
  const [total, active, admins, projectsTotal, topDomains, categories, saves, ai, api] = await Promise.all([
    User.countDocuments(), User.countDocuments({ is_active: true }), User.countDocuments({ role: 'admin' }), Project.countDocuments(),
    groupCount(ProjectPreference, 'domain'), groupCount(Project, 'domain'),
    SavedProject.aggregate([{ $group: { _id: '$project_id', saves: { $sum: 1 } } }, { $sort: { saves: -1 } }, { $limit: 50 }]), usage('ai'), usage('search'),
  ])
  const titles = new Map((await Project.find({ _id: { $in: saves.map((s) => s._id) } }).select('title').lean()).map((p) => [String(p._id), p.title]))
  const byTitle = new Map()
  for (const s of saves) { const t = titles.get(String(s._id)); if (t) byTitle.set(t, (byTitle.get(t) || 0) + s.saves) }
  const popular = [...byTitle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([title, n]) => ({ title, saves: n }))
  res.json({ users: { total, active, admins }, projects_total: projectsTotal, top_domains: topDomains, categories, popular_projects: popular, ai_usage: ai, api_usage: api })
}

export async function logs(req, res) {
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const rows = await UsageLog.find({ $or: [{ kind: 'error' }, { success: false }] }).sort({ _id: -1 }).limit(limit).lean()
  res.json({ logs: rows.map((r) => ({ id: String(r._id), kind: r.kind, name: r.name, detail: r.detail, created_at: r.created_at })) })
}

export async function users(_req, res) {
  const rows = await User.find().sort({ _id: 1 })
  res.json({ users: rows.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, is_active: u.is_active, created_at: u.created_at, last_login_at: u.last_login_at })) })
}

export async function updateUser(req, res) {
  const u = await User.findById(req.params.id)
  if (!u) throw new HttpError(404, 'User not found')
  if (String(u._id) === String(req.user._id) && (req.body.is_active === false || req.body.role === 'user')) throw new HttpError(400, 'You cannot demote or disable your own account')
  if (req.body.is_active !== undefined) u.is_active = req.body.is_active
  if (req.body.role) u.role = req.body.role
  await u.save()
  res.json({ id: String(u._id), role: u.role, is_active: u.is_active })
}
