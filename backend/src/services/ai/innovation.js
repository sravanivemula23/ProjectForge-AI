import { runStructured } from './runStructured.js'
import { GapsOut, ImprovedOut } from './schemas.js'
import { tokenize } from '../embeddings/hashing.js'

// [title, category, rationale, keywords that indicate the angle is already covered]
const LIBRARY = [
  ['Add explainability (feature attributions / attention maps)', 'explainability', 'Lets users and reviewers see why a prediction was made, which raises trust and evaluation quality.', ['explain', 'grad-cam', 'attention', 'interpretab']],
  ['Report uncertainty / confidence calibration', 'reliability', 'Flags low-confidence cases for human review instead of guessing.', ['uncertainty', 'calibrat', 'confidence']],
  ['Support offline or edge deployment', 'deployment', 'Makes the solution usable where connectivity is poor and reduces latency and cost.', ['edge', 'offline', 'on-device', 'tflite', 'mobile']],
  ['Preserve privacy with on-device or federated processing', 'privacy', 'Keeps sensitive data local while still enabling learning.', ['federated', 'privacy', 'differential']],
  ['Publish a new benchmark dataset or evaluation protocol', 'dataset', 'Creates a reusable research contribution and enables fair comparison.', ['benchmark', 'dataset']],
  ['Add multilingual / accessibility support', 'new_user_group', 'Opens the product to under-served user groups.', ['multilingual', 'accessib', 'language']],
  ['Close the loop with user feedback and active learning', 'algorithm', 'Continuously improves the model from corrections made by real users.', ['feedback', 'active learning', 'human-in-the-loop']],
  ['Add monitoring for data drift and model performance (MLOps)', 'deployment', 'Shows production-readiness and catches silent degradation.', ['drift', 'mlops', 'monitoring']],
  ['Integrate with existing tools via an open API/webhooks', 'integration', 'Makes adoption easier and demonstrates real-world engineering.', ['api', 'webhook', 'integration']],
  ['Combine multiple modalities (e.g. image + text/metadata)', 'algorithm', 'Multimodal fusion often outperforms single-source baselines.', ['multimodal', 'multi-modal', 'fusion']],
]

function fallbackGaps(items) {
  const corpus = items.map((i) => `${i.title} ${i.description}`).join(' ').toLowerCase()
  const terms = new Map()
  for (const i of items) for (const t of new Set(tokenize(`${i.title} ${i.description}`))) if (t.length > 3) terms.set(t, (terms.get(t) || 0) + 1)
  const common = [...terms.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, c]) => `'${t}' appears in ${c} of ${items.length} retrieved sources`)
  const absent = LIBRARY.filter((L) => !L[3].some((k) => corpus.includes(k)))
  const ordered = [...absent, ...LIBRARY.filter((L) => !absent.includes(L))].slice(0, 8)
  return {
    common_features: common,
    missing_features: absent.slice(0, 6).map((L) => `No retrieved source mentions: ${L[0].toLowerCase()}`),
    technical_limitations: ['Most public prototypes are evaluated on a single dataset or small demo scenario (typical, verify per source).', 'Few student projects report robustness, calibration or deployment metrics.'],
    research_gaps: ['Standardised evaluation across datasets/users is rarely reported.', 'Human-in-the-loop evaluation is often missing.'],
    improvements: ordered.map(([title, category, rationale], i) => ({ title, category, rationale: rationale + (absent.includes(ordered[i]) ? ' No retrieved source mentions it.' : '') })),
    new_datasets: ['Collect or curate a small, well-documented evaluation set for your niche and publish it with a datasheet.'],
    new_algorithms: ['Compare a baseline against a modern architecture and report an ablation study.'],
    new_user_groups: ['Target an under-served group (e.g. regional-language users or low-bandwidth settings).'],
    new_deployment_methods: ['Offer an offline/edge build or a containerised on-prem option.'],
    new_integrations: ['Expose a documented REST API so other tools can integrate.'],
  }
}

export const findGaps = (ideaText, concepts, items, userId) => {
  const evidence = items.slice(0, 12).map((i) => ({ source: i.source, title: i.title, summary: (i.description || '').slice(0, 300) }))
  const prompt = 'Given the student\'s idea and REAL retrieved sources (evidence), identify innovation gaps. Base common_features on the evidence only. Return JSON with keys: common_features[], missing_features[], ' +
    'technical_limitations[], research_gaps[], improvements[{title,category,rationale}] (at least 5, concrete and feasible for students), new_datasets[], new_algorithms[], new_user_groups[], new_deployment_methods[], new_integrations[].\n' +
    `Idea: ${ideaText}\nConcepts: ${JSON.stringify(concepts)}\nEvidence: ${JSON.stringify(evidence)}`
  return runStructured('innovation_gaps', prompt, GapsOut, () => fallbackGaps(items), userId)
}

function fallbackImprove(project, gaps) {
  const d = project.data || {}
  const imps = gaps?.improvements?.length ? gaps.improvements : LIBRARY.slice(0, 5).map(([title, category, rationale]) => ({ title, category, rationale }))
  const chosen = imps.slice(0, 5)
  const added = chosen.map((i) => ({ feature: i.title, why: i.rationale || '' }))
  const suffix = ' with ' + chosen.slice(0, 3).map((i) => i.title.split(' (')[0].replace('Add ', '').toLowerCase()).join(', ')
  return {
    improved_title: `${project.title}${suffix}`,
    improved_description: `${d.short_description || project.title} Extended with: ${added.map((a) => a.feature).join('; ')}.`,
    problem_statement: d.problem_statement || '', added_features: added,
    technologies: [...new Set([...(d.technologies || []), 'Docker'])],
    modules: [...new Set([...(d.modules || []), ...added.slice(0, 3).map((a) => a.feature.split(' (')[0])])],
    ai_ml_components: d.ai_ml_components || [], innovation_opportunities: added.map((a) => a.feature),
    estimated_weeks: Math.floor((d.estimated_weeks || 12) * 1.25),
  }
}
export const improve = (project, gaps, userId) => {
  const prompt = 'Transform this basic project idea into a stronger, still-feasible student project. Return JSON: improved_title, improved_description, problem_statement, added_features[{feature, why}] ' +
    '(explain exactly what was added and why), technologies[], modules[], ai_ml_components[], innovation_opportunities[], estimated_weeks(int).\n' +
    `Project: ${JSON.stringify({ title: project.title, ...(project.data || {}) }).slice(0, 3500)}\nKnown gaps: ${JSON.stringify(gaps || {}).slice(0, 3000)}`
  return runStructured('improve', prompt, ImprovedOut, () => fallbackImprove(project, gaps), userId)
}
