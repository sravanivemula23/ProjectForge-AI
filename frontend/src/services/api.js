// Empty by default: requests go to the same origin (/api) and the Vite dev server proxies them to the Express backend.
// Set VITE_API_URL for a separately hosted API (e.g. Vercel frontend + Render backend).
const BASE = (import.meta.env?.VITE_API_URL ?? '').replace(/\/$/, '')
const KEY = 'pf_token'

export const tokenStore = {
  get: () => localStorage.getItem(KEY),
  set: (t) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

async function request(method, path, body, { raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const t = tokenStore.get()
  if (t) headers.Authorization = `Bearer ${t}`
  let res
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and that the backend is running.', 0)
  }
  if (res.status === 401 && t) { tokenStore.clear(); window.dispatchEvent(new Event('pf:logout')) }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try { const j = await res.json(); if (typeof j.detail === 'string') msg = j.detail } catch { /* ignore */ }
    throw new ApiError(msg, res.status)
  }
  if (res.status === 204) return null
  return raw ? res : res.json()
}

const get = (p) => request('GET', p)
const post = (p, b) => request('POST', p, b ?? {})

export const api = {
  register: (b) => post('/auth/register', b),
  login: (b) => post('/auth/login', b),
  forgot: (b) => post('/auth/forgot-password', b),
  reset: (b) => post('/auth/reset-password', b),
  me: () => get('/users/me'),
  saveProfile: (b) => request('PUT', '/users/me/profile', b),
  dashboard: () => get('/dashboard'),
  recommend: (b) => post('/projects/recommend', b),
  recommendations: () => get('/projects/recommendations'),
  listProjects: (params = {}) => get(`/projects?${new URLSearchParams(params)}`),
  project: (id) => get(`/projects/${id}`),
  deleteProject: (id) => request('DELETE', `/projects/${id}`),
  analyze: (b) => post('/projects/analyze', b),
  improve: (project_id) => post('/projects/improve', { project_id }),
  roadmap: (project_id) => post('/projects/roadmap', { project_id }),
  architecture: (project_id) => post('/projects/architecture', { project_id }),
  documentation: (project_id) => post('/projects/documentation', { project_id }),
  compare: (project_ids) => post('/projects/compare', { project_ids }),
  save: (id) => post(`/projects/${id}/save`),
  unsave: (id) => request('DELETE', `/projects/${id}/save`),
  favorite: (id) => post(`/projects/${id}/favorite`),
  // 2.0 intelligence
  githubRelated: (projectId, { limit = 20, refresh = false } = {}) => get(`/github/related?${new URLSearchParams({ projectId, limit, refresh })}`),
  githubAnalyze: (projectId) => get(`/github/analyze?projectId=${projectId}`),
  researchRelated: (projectId, { refresh = false } = {}) => get(`/research/related?${new URLSearchParams({ projectId, limit: 10, refresh })}`),
  intelligence: (id) => get(`/projects/${id}/analysis`),
  novelty: (project_id, refresh = false) => post('/projects/novelty', { project_id, refresh }),
  realityCheck: (project_id) => post('/projects/reality-check', { project_id }),
  differentiate: (project_id) => post('/projects/differentiate', { project_id }),
  feasibility: (project_id) => post('/projects/feasibility', { project_id }),
  blueprint: (project_id) => post('/projects/blueprint', { project_id }),
  setProgress: (id, status) => request('PATCH', `/projects/${id}/progress`, { status }),
  searchGithub: (query) => post('/search/github', { query }),
  searchPapers: (query) => post('/search/papers', { query }),
  admin: { stats: () => get('/admin/stats'), users: () => get('/admin/users'), logs: () => get('/admin/logs'),
    updateUser: (id, b) => request('PATCH', `/admin/users/${id}`, b) },
  async download(id, format) {
    const res = await request('GET', `/projects/${id}/export?format=${format}`, null, { raw: true })
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `project-${id}.${format}`; a.click()
    URL.revokeObjectURL(a.href)
  },
}
