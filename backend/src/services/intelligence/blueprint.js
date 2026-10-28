import { z } from 'zod'
import { runStructured } from '../ai/runStructured.js'
import { list } from '../ai/schemas.js'

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'item'
export const BlueprintOut = z.object({
  title: z.string().min(3), one_line_idea: z.string().min(5), problem_statement: z.string().min(5), proposed_solution: z.string().min(5), objectives: list, target_users: list,
  key_features: list, unique_features: list, existing_system_limitations: list, proposed_system_advantages: list,
  architecture: z.object({ overview: z.string().default(''), layers: z.array(z.object({ name: z.string(), components: list })).min(3) }),
  technology_stack: z.object({ frontend: list, backend: list, database: list, ai_ml: list, devops: list }),
  frontend: list, backend: list, database: list, ai_ml_components: list, apis: z.array(z.object({ method: z.string(), path: z.string(), purpose: z.string() })), dataset_requirements: list,
  security: list, testing: list, deployment: list, future_enhancements: list,
})

function fallback(c, ctx) {
  const mods = c.modules.length ? c.modules : ['Core module'], ml = c.ai_ml_components, tech = c.technologies
  const uniq = [...new Set([...(ctx.chosenFeatures || []), ...c.innovation_opportunities])].slice(0, 6)
  const limits = [...(ctx.researchGaps || []).slice(0, 3).map((g) => `Retrieved research does not cover: ${g}`), ...(ctx.commonFeatures || []).slice(0, 2).map((f) => `Existing work commonly offers only: ${f}`)]
  return {
    title: c.title, one_line_idea: c.short_description || c.title, problem_statement: c.problem_statement || `Users of ${c.domain} solutions need a better way to achieve: ${c.title}.`,
    proposed_solution: `${c.short_description} Built as a modular web platform with ${mods.length} main modules${ml.length ? ` and ${ml.join(', ')}` : ''}.`,
    objectives: [...mods.slice(0, 4).map((m) => `Design and implement: ${m}`), 'Evaluate quality with agreed metrics and user testing', 'Deploy and document the solution'], target_users: c.target_users,
    key_features: mods, unique_features: uniq, existing_system_limitations: limits.length ? limits : ['Run Research analysis to list verified limitations of existing work (information unavailable until then).'],
    proposed_system_advantages: [...uniq.slice(0, 3).map((u) => `Adds ${u}`), 'Modular, testable architecture'],
    architecture: { overview: `${c.title} uses a client -> REST API -> services -> AI/ML -> database architecture.`, layers: [{ name: 'Client', components: ['React UI', 'Auth screens'] }, { name: 'API', components: ['Express routes', 'JWT auth', 'Validation'] }, { name: 'Services', components: mods.slice(0, 6) }, { name: 'AI/ML', components: ml.length ? ml : ['Model service'] }, { name: 'Data', components: ['MongoDB'] }] },
    technology_stack: { frontend: ['React', 'Vite', 'Tailwind CSS'], backend: ['Node.js', 'Express'], database: ['MongoDB'], ai_ml: ml.length ? ml : ['Not required'], devops: ['Docker', 'GitHub Actions'] },
    frontend: ['Responsive React UI with route protection', ...mods.slice(0, 4).map((m) => `${m} screen`), 'Loading, empty and error states'],
    backend: ['REST API with JWT and role-based access', 'Request validation (zod)', 'Service layer per module', 'Rate limiting and error handling'], database: ['MongoDB collections per core entity', 'Indexes on lookup fields', ...(ml.length ? ['Store predictions with model version'] : [])],
    ai_ml_components: ml.length ? ml : ['No ML component required'], apis: [{ method: 'POST', path: '/api/auth/login', purpose: 'Authenticate a user' }, ...mods.slice(0, 5).map((m) => ({ method: 'POST', path: `/api/${slug(m)}`, purpose: `Run: ${m}` })), { method: 'GET', path: '/api/dashboard', purpose: 'Summary data for the user dashboard' }],
    dataset_requirements: ['Define the data you need (type, volume, labels) before building the model.', ...(ctx.datasetNotes?.length ? ['Datasets referenced in retrieved papers (verify access and licence): ' + ctx.datasetNotes.join(' | ')] : ['Dataset availability: information unavailable. Search for public datasets and verify licences.']), 'Keep a held-out test set and document data provenance.'],
    security: ['Hash passwords (bcrypt) and use short-lived JWTs', 'Validate and sanitise all input', 'Rate-limit expensive endpoints', 'Keep API keys server-side in environment variables', 'Least-privilege roles'],
    testing: ['Unit tests for services', 'API tests with Supertest', 'Component tests for the UI', 'Model evaluation on a held-out set', 'Manual user testing'],
    deployment: c.deployment_options.length ? c.deployment_options.map((d) => `Deploy via: ${d}`) : ['Docker Compose for development', 'Frontend on Vercel, API on Render, MongoDB Atlas'],
    future_enhancements: [...uniq.slice(3), 'Mobile app', 'Admin analytics', 'Pilot with real users'].slice(0, 6),
  }
}

export async function generateBlueprint(c, ctx = {}, userId = null) {
  const prompt = 'Write a complete project blueprint as JSON with keys: title, one_line_idea, problem_statement, proposed_solution, objectives[], target_users[], key_features[], unique_features[], existing_system_limitations[], proposed_system_advantages[], ' +
    'architecture{overview, layers[{name, components[]}]}, technology_stack{frontend[],backend[],database[],ai_ml[],devops[]}, frontend[], backend[], database[], ai_ml_components[], apis[{method,path,purpose}], dataset_requirements[], security[], testing[], deployment[], future_enhancements[]. ' +
    'Do not invent datasets, papers, statistics or repositories; describe dataset REQUIREMENTS only. Base existing-system limitations only on the provided evidence.\n' +
    `Project: ${JSON.stringify({ title: c.title, description: c.short_description, domain: c.domain, technologies: c.technologies, ai_ml: c.ai_ml_components, modules: c.modules, innovations: c.innovation_opportunities })}\nEvidence: ${JSON.stringify({ researchGaps: ctx.researchGaps || [], commonFeatures: ctx.commonFeatures || [], chosenFeatures: ctx.chosenFeatures || [] })}`
  return runStructured('blueprint', prompt, BlueprintOut, () => fallback(c, ctx), userId)
}
