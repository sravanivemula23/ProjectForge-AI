import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { createApp } from './app.js'
import { seed } from './scripts/seed.js'
import { ensureVectorIndexes } from './scripts/createVectorIndexes.js'

async function main() {
  const app = createApp()
  await connectDb()
  const { User, Project, ProjectAnalysis, ProjectScore, SimilarProject, ResearchPaper } = await import('./models/index.js')
  await Promise.all([User, Project, ProjectAnalysis, ProjectScore, SimilarProject, ResearchPaper].map((m) => m.init()))
  if (env.autoSeed) await seed()
  ensureVectorIndexes().then((r) => r.created?.length && console.log('[vector] created indexes on', r.created.join(', '))).catch(() => {})
  app.listen(env.port, '0.0.0.0', () => console.log(`ProjectForge AI API listening on :${env.port}`))
}
main().catch((err) => { console.error('Fatal startup error:', err.message); process.exit(1) })
