import { runStructured } from '../ai/runStructured.js'
import { RoadmapOut, ArchitectureOut } from '../ai/schemas.js'
import { buildWeeklyPlan } from '../intelligence/weeklyPlan.js'

const PHASES = [
  ['Requirement Analysis', 0.05, ['Define users, scope and success metrics', 'Write user stories and acceptance criteria'], 'Requirements document', ['Notion', 'Figma'], []],
  ['Research', 0.08, ['Review related work and existing projects', 'Select baselines and evaluation metrics'], 'Literature & competitor summary', ['Semantic Scholar', 'GitHub'], [1]],
  ['Dataset/Data Collection', 0.1, ['Identify or collect data', 'Clean, label and split data', 'Document licences and ethics'], 'Versioned dataset + datasheet', ['Python', 'pandas'], [2]],
  ['System Design', 0.07, ['Design architecture and API contracts', 'Design database schema'], 'Architecture diagrams, ERD, OpenAPI draft', ['draw.io', 'MongoDB'], [1, 2]],
  ['Backend', 0.15, ['Implement auth and core APIs', 'Add validation, logging, tests'], 'Tested REST API', ['Express', 'MongoDB'], [4]],
  ['Frontend', 0.13, ['Build pages and components', 'Connect to API', 'Handle loading/error states'], 'Responsive web UI', ['React', 'Tailwind CSS'], [4]],
  ['AI/ML Model', 0.17, ['Train and evaluate baseline', 'Iterate and run ablations', 'Package model for serving'], 'Trained model + evaluation report', ['Python'], [3]],
  ['Integration', 0.06, ['Wire model into API and UI', 'End-to-end flow checks'], 'Working end-to-end system', ['Docker'], [5, 6, 7]],
  ['Testing', 0.08, ['Unit, integration and user testing', 'Performance and security checks'], 'Test report', ['Vitest', 'Supertest'], [8]],
  ['Deployment', 0.06, ['Containerise and deploy', 'Set up monitoring and backups'], 'Live deployment URL', ['Docker', 'Vercel', 'Render'], [9]],
  ['Documentation', 0.05, ['Write report, README and demo video', 'Prepare viva/presentation'], 'Report, README, slides', ['Markdown'], [10]],
]
const r1 = (x) => Math.round(x * 10) / 10

function fallbackRoadmap(project) {
  const d = project.data || {}
  const weeks = Number(d.estimated_weeks || 12), tech = d.technologies || []
  return { phases: PHASES.map(([name, frac, tasks, out, techs, deps], idx) => {
    const extra = ['Backend', 'Frontend', 'AI/ML Model', 'Integration'].includes(name) ? tech.slice(0, 3) : []
    let t = [...tasks]
    if (name === 'AI/ML Model' && d.ai_ml_components?.length) t = [...d.ai_ml_components.slice(0, 3).map((c) => `Implement: ${c}`), ...t.slice(1)]
    if (name === 'Backend' && d.modules?.length) t = [...d.modules.slice(0, 3).map((m) => `Module: ${m}`), ...t]
    return { number: idx + 1, name, tasks: t, expected_output: out, technologies: [...new Set([...techs, ...extra])], estimated_weeks: r1(Math.max(0.5, weeks * frac)), dependencies: deps.map((x) => `Phase ${x}`) }
  }) }
}
export async function generateRoadmap(project, userId, ctx = {}) {
  const prompt = 'Create an 11-phase development roadmap (Requirement Analysis, Research, Dataset/Data Collection, System Design, Backend, Frontend, AI/ML Model, Integration, Testing, Deployment, Documentation). ' +
    'JSON: {"phases": [{number, name, tasks[], expected_output, technologies[], estimated_weeks(number), dependencies[]}]}.\n' +
    `Project: ${JSON.stringify({ title: project.title, ...(project.data || {}) }).slice(0, 3500)}`
  const res = await runStructured('roadmap', prompt, RoadmapOut, () => fallbackRoadmap(project), userId)
  res.data.total_weeks = r1(res.data.phases.reduce((s, p) => s + p.estimated_weeks, 0))
  res.data.weekly_plan = buildWeeklyPlan(res.data.phases, { teamSize: ctx.teamSize || 1, hasML: (project.data?.ai_ml_components || []).length > 0 })
  return res
}

function fallbackArch(project) {
  const d = project.data || {}
  return {
    system_overview: `${project.title} follows a three-tier architecture with a dedicated AI service layer.`,
    layers: [
      { name: 'Client', components: ['Web/mobile UI', 'Auth screens', 'Dashboards'] },
      { name: 'API', components: ['REST endpoints', 'JWT auth', 'Validation', 'Rate limiting'] },
      { name: 'Services', components: (d.modules?.length ? d.modules : ['Core module']).slice(0, 6) },
      { name: 'AI/ML', components: d.ai_ml_components?.length ? d.ai_ml_components : ['Model service'] },
      { name: 'Data', components: ['MongoDB', 'Object storage / files', 'Vector index (if retrieval is used)'] },
    ],
    frontend: ['Pages and routing', 'Reusable components', 'API client with auth interceptor', 'State & error handling'],
    backend: ['Routes', 'Controllers', 'Validation schemas', 'Service layer', 'Mongoose models', 'Background jobs (optional)'],
    database_tables: [{ name: 'users', columns: ['_id', 'email', 'password_hash', 'role'] }, { name: 'records', columns: ['_id', 'user_id', 'payload', 'created_at'] }, { name: 'predictions', columns: ['_id', 'record_id', 'result', 'confidence', 'model_version'] }],
    ai_pipeline: ['Ingest data', 'Pre-process', 'Model inference', 'Post-process / explain', 'Store result', 'Collect feedback'],
    api_flow: [{ from: 'Client', to: 'API', action: 'POST request with JWT' }, { from: 'API', to: 'Services', action: 'Validate and route' }, { from: 'Services', to: 'AI/ML', action: 'Run inference' },
      { from: 'Services', to: 'Data', action: 'Persist results' }, { from: 'API', to: 'Client', action: 'JSON response' }],
  }
}
export function generateArchitecture(project, userId) {
  const prompt = 'Design the architecture. JSON: system_overview, layers[{name, components[]}] (>=3), frontend[], backend[], database_tables[{name, columns[]}], ai_pipeline[], api_flow[{from,to,action}].\n' +
    `Project: ${JSON.stringify({ title: project.title, ...(project.data || {}) }).slice(0, 3500)}`
  return runStructured('architecture', prompt, ArchitectureOut, () => fallbackArch(project), userId)
}
