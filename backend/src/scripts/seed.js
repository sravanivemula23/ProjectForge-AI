/** Seeds admin + demo users and 10 clearly-labelled demo projects (templates, not real external projects). Idempotent. */
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { User, Project, ProjectScore } from '../models/index.js'
import { CATALOG } from '../services/ai/catalog.js'
import { IdeaOut } from '../services/ai/schemas.js'
import { enrich } from '../services/recommendation/index.js'
import { scoreProject, METHOD_VERSION } from '../services/scoring/index.js'

export async function seed() {
  if (await User.exists({})) return false
  const s = env.seed
  await User.create({ email: s.adminEmail, name: 'Admin', role: 'admin', password_hash: await bcrypt.hash(s.adminPassword, 10) })
  const demo = await User.create({
    email: s.demoEmail, name: 'Demo Student', password_hash: await bcrypt.hash(s.demoPassword, 10),
    profile: { education: 'B.Tech', branch: 'Computer Science', year: 'Final year', skills: ['Python', 'React', 'SQL'], programming_languages: ['Python', 'JavaScript'], frameworks: ['Express', 'React'],
      ai_ml_knowledge: ['PyTorch'], database_knowledge: ['MongoDB'], cloud_knowledge: ['Docker'], interests: ['healthcare', 'computer vision'], preferred_domains: ['Healthcare', 'AI/ML'], career_goal: 'ML engineer', experience_level: 'intermediate' },
  })
  const prof = demo.profile.toObject()
  for (const tpl of CATALOG.slice(0, 10)) {
    const idea = { ...enrich(IdeaOut.parse(tpl)), label: 'Seed/demo template - not a claim about any real external project' }
    const p = await Project.create({ user_id: demo._id, title: idea.title, short_description: idea.short_description, domain: idea.domain, difficulty: idea.difficulty, source: 'seed_demo', origin: 'template', is_demo: true, data: idea })
    const sc = scoreProject(idea, prof, null)
    await ProjectScore.create({ project_id: p._id, scores: sc.scores, explanations: sc.explanations, overall: sc.overall, novelty_verified: false, methodology: METHOD_VERSION })
  }
  console.log('[seed] demo data created')
  return true
}

if (process.argv[1]?.endsWith('seed.js')) {
  const { connectDb, disconnectDb } = await import('../config/db.js')
  await connectDb(); await seed(); await disconnectDb()
}
