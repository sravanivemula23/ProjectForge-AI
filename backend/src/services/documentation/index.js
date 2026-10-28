import { runStructured } from '../ai/runStructured.js'
import { DocumentationOut } from '../ai/schemas.js'

/** References come ONLY from retrieved, verified sources - never from the LLM. */
export const buildReferences = (sources) => sources.slice(0, 12).map((s) => {
  const authors = (s.authors || []).join(', ')
  return [authors ? `${authors}.` : '', `${s.title}.`, s.venue ? `${s.venue}.` : '', s.published ? `(${s.published}).` : '', s.url || '', `[${s.source}]`].filter(Boolean).join(' ')
})

function fallback(project, analysis) {
  const d = project.data || {}, t = project.title
  const mods = d.modules || [], tech = d.technologies || [], ml = d.ai_ml_components || []
  const sim = analysis?.existing_similarity
  const existing = sim != null ? `Existing projects and papers were retrieved during novelty analysis (see References); similar systems typically cover core functionality with estimated overlap of ${sim}%.` : 'A novelty analysis against external sources has not been run yet.'
  return {
    title: t,
    abstract: `${d.short_description || t} ${d.problem_statement || ''} The system is built with ${tech.slice(0, 5).join(', ')} and delivers: ${d.expected_output || 'a working prototype'}`,
    introduction: `${t} addresses the following need: ${d.problem_statement || 'a practical problem faced by its target users'}`,
    problem_statement: d.problem_statement || '', existing_system: existing,
    proposed_system: `${d.short_description || ''} Key innovation angles: ${(d.innovation_opportunities || []).slice(0, 5).join(', ') || 'to be defined'}.`,
    objectives: [...mods.slice(0, 5).map((m) => `Design and implement: ${m}`), 'Evaluate the system with suitable metrics', 'Document and deploy the solution'],
    methodology: 'Iterative development: requirements, research, data collection, design, implementation, integration, testing, deployment and documentation.',
    architecture: 'Client (UI) -> REST API -> service layer -> AI/ML components -> database.',
    modules: mods, technologies: tech, advantages: ['Personalised to the target users', 'Modular architecture', ...ml.slice(0, 2).map((c) => `Uses ${c}`)],
    limitations: ['Accuracy depends on data quality and size', 'Prototype-scale deployment', 'Novelty estimate depends on retrievable public sources'],
    future_scope: ['Larger and more diverse datasets', 'Mobile/edge deployment', 'Pilot with real users', 'Publish evaluation results'],
    conclusion: `${t} demonstrates an end-to-end, practical solution and offers clear directions for further research and productisation.`,
    resume_description: `Built ${t}: ${d.short_description || ''} Tech: ${tech.slice(0, 6).join(', ')}. ${ml.length ? `Implemented ${ml.slice(0, 2).join(', ')}.` : ''}`,
    readme_md: `# ${t}\n\n${d.short_description || ''}\n\n## Problem\n${d.problem_statement || ''}\n\n## Features\n${mods.map((m) => `- ${m}`).join('\n')}\n\n## Tech stack\n${tech.map((x) => `- ${x}`).join('\n')}\n\n## Getting started\n\`\`\`bash\ngit clone <repo>\ncd project\ndocker compose up\n\`\`\`\n`,
    ppt_outline: ['Title & team', 'Problem & motivation', 'Existing solutions & gaps', 'Proposed system', 'Architecture', 'AI/ML approach', 'Demo', 'Results & evaluation', 'Limitations & future work', 'Q&A'],
    viva_questions: [
      { question: 'Why did you choose this problem?', answer: d.problem_statement || 'Explain the real-world need and who benefits.' },
      { question: 'How is your project different from existing ones?', answer: 'Compare with retrieved projects/papers and point to your added innovation angles.' },
      { question: 'Why did you choose these technologies?', answer: `Justify ${tech.slice(0, 4).join(', ')} by fit, ecosystem and your skills.` },
      { question: 'How did you evaluate the system?', answer: 'Describe metrics, baselines, datasets and user testing.' },
      { question: 'What are the limitations?', answer: 'Discuss data limits, generalisation, privacy and scale.' },
    ],
    interview_explanation: `I built ${t}. The problem was ${d.problem_statement || 'a real user need'}. I designed a modular system using ${tech.slice(0, 4).join(', ')}, implemented ${ml.slice(0, 2).join(', ') || 'the core logic'}, and evaluated it against baselines. The hardest part was integrating components reliably.`,
  }
}

export async function generateDocumentation(project, analysis, sources, userId) {
  const prompt = 'Write complete academic project documentation as JSON with keys: title, abstract, introduction, problem_statement, existing_system, proposed_system, objectives[], methodology, architecture, modules[], ' +
    'technologies[], advantages[], limitations[], future_scope[], conclusion, resume_description, readme_md, ppt_outline[], viva_questions[{question,answer}], interview_explanation. ' +
    'Do NOT include references or invent citations. In existing_system describe only what the provided verified sources show.\n' +
    `Project: ${JSON.stringify({ title: project.title, ...(project.data || {}) }).slice(0, 3000)}\nVerified sources: ${JSON.stringify(sources.slice(0, 10).map((s) => ({ title: s.title, source: s.source })))}\n` +
    `Analysis: ${JSON.stringify({ existing_similarity: analysis?.existing_similarity, novelty_score: analysis?.novelty_score })}`
  const res = await runStructured('documentation', prompt, DocumentationOut, () => fallback(project, analysis), userId)
  res.data.references = buildReferences(sources)
  return res
}
