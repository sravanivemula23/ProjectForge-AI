import { Router } from 'express'
import { asyncHandler as h } from '../utils/httpError.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { validate, validateId, validateQuery } from '../middleware/validate.js'
import { authLimiter, githubLimiter, researchLimiter, aiLimiter } from '../middleware/rateLimit.js'
import * as intel from '../controllers/intelligenceController.js'
import * as V from '../validators.js'
import * as auth from '../controllers/authController.js'
import * as users from '../controllers/userController.js'
import * as projects from '../controllers/projectController.js'
import * as search from '../controllers/searchController.js'
import * as admin from '../controllers/adminController.js'
import { dashboard } from '../controllers/dashboardController.js'
import { llmAvailable } from '../services/ai/llmClient.js'
import { getEmbedder } from '../services/embeddings/index.js'
import { vectorSearchStatus } from '../services/embeddings/vectorStore.js'
import { env } from '../config/env.js'

const api = Router()

api.get('/health', h(async (_req, res) => res.json({ status: 'ok', llm_configured: llmAvailable(), embedding_backend: (await getEmbedder()).name, vector_search: vectorSearchStatus(), github_token: !!env.githubToken })))

const a = Router()
a.use(authLimiter)
a.post('/register', validate(V.registerSchema), h(auth.register))
a.post('/login', validate(V.loginSchema), h(auth.login))
a.post('/logout', authenticate, auth.logout)
a.post('/forgot-password', validate(V.forgotSchema), h(auth.forgotPassword))
a.post('/reset-password', validate(V.resetSchema), h(auth.resetPassword))
api.use('/auth', a)

const u = Router()
u.use(authenticate)
u.get('/me', users.me)
u.put('/me', validate(V.userUpdateSchema), h(users.updateMe))
u.put('/me/profile', validate(V.profileSchema), h(users.updateProfile))
api.use('/users', u)

const p = Router()
p.use(authenticate)
p.param('id', validateId('Project'))
p.post('/recommend', validate(V.preferencesSchema), h(projects.recommend))
p.get('/recommendations', h(projects.latestRecommendations))
p.post('/analyze', validate(V.analyzeSchema), h(projects.analyze))
p.post('/improve', validate(V.projectIdSchema), h(projects.improve))
p.post('/compare', validate(V.compareSchema), h(projects.compare))
p.post('/roadmap', validate(V.projectIdSchema), h(projects.roadmap))
p.post('/architecture', validate(V.projectIdSchema), h(projects.architecture))
p.post('/documentation', validate(V.projectIdSchema), h(projects.documentation))
// 2.0 intelligence endpoints (per-user rate limited; external APIs are cached and de-duplicated in the services)
p.post('/novelty', aiLimiter, validate(V.intelRequestSchema), h(intel.novelty))
p.post('/reality-check', aiLimiter, validate(V.intelRequestSchema), h(intel.realityCheck))
p.post('/differentiate', aiLimiter, validate(V.intelRequestSchema), h(intel.differentiate))
p.post('/feasibility', aiLimiter, validate(V.intelRequestSchema), h(intel.feasibility))
p.post('/blueprint', aiLimiter, validate(V.intelRequestSchema), h(intel.blueprint))
p.get('/:id/analysis', h(intel.analysis))
p.patch('/:id/progress', validate(V.progressSchema), h(intel.setProgress))
p.get('/', h(projects.list))
p.get('/:id', h(projects.get))
p.delete('/:id', h(projects.remove))
p.post('/:id/save', h(projects.save))
p.delete('/:id/save', h(projects.unsave))
p.post('/:id/favorite', h(projects.toggleFavorite))
p.get('/:id/export', h(projects.exportProject))
api.use('/projects', p)

const gh = Router()
gh.use(authenticate, githubLimiter)
gh.get('/related', validateQuery(V.githubQuerySchema), h(intel.githubRelated))
gh.get('/analyze', validateQuery(V.githubQuerySchema), h(intel.githubAnalyze))
api.use('/github', gh)

const rs = Router()
rs.use(authenticate, researchLimiter)
rs.get('/related', validateQuery(V.githubQuerySchema), h(intel.researchRelated))
api.use('/research', rs)

const s = Router()
s.use(authenticate)
s.post('/github', validate(V.searchSchema), h(search.github))
s.post('/papers', validate(V.searchSchema), h(search.papers))
api.use('/search', s)

api.get('/dashboard', authenticate, h(dashboard))

const ad = Router()
ad.use(authenticate, requireAdmin)
ad.param('id', validateId('User'))
ad.get('/stats', h(admin.stats))
ad.get('/logs', h(admin.logs))
ad.get('/users', h(admin.users))
ad.patch('/users/:id', validate(V.adminUserSchema), h(admin.updateUser))
api.use('/admin', ad)

export default api
