import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { api } from '../services/api'
import GithubProjects, { RepoCard, isGithubUrl } from '../components/intel/GithubProjects'
import NoveltyBreakdown from '../components/intel/NoveltyBreakdown'
import RealityCheck from '../components/intel/RealityCheck'
import ResearchPapers, { GapAnalysis, PaperCard } from '../components/intel/ResearchPapers'
import QualityScore from '../components/intel/QualityScore'
import BlueprintView, { SECTIONS } from '../components/intel/BlueprintView'
import WeeklyPlan from '../components/intel/WeeklyPlan'
import Differentiation from '../components/intel/Differentiation'
import FeasibilityCard from '../components/intel/FeasibilityCard'
import ProjectCard from '../components/ProjectCard'
import Compare from '../pages/Compare'

vi.mock('recharts', () => { const P = ({ children }) => <div>{children}</div>; return { ResponsiveContainer: P, BarChart: P, Bar: P, CartesianGrid: P, Legend: P, PolarAngleAxis: P, PolarGrid: P, Radar: P, RadarChart: P, Tooltip: P, XAxis: P, YAxis: P } })
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
afterEach(() => vi.restoreAllMocks())

const repo = (o = {}) => ({ name: 'plant-disease-detection', fullName: 'octo/plant-disease-detection', owner: 'octo', description: 'Plant disease detection using CNN', url: 'https://github.com/octo/plant-disease-detection', stars: 1200, forks: 30,
  language: 'Python', topics: ['cnn', 'plant'], updatedAt: '2026-09-20T00:00:00Z', archived: false, license: 'MIT', activity: 'active', relevanceScore: 91, ...o })
const many = (n) => Array.from({ length: n }, (_, i) => repo({ name: `repo-${i}`, fullName: `o/repo-${i}`, url: `https://github.com/o/repo-${i}`, relevanceScore: 90 - i }))

describe('GitHub projects', () => {
  test('shows a loading state, then professional cards with a real, safe GitHub link', async () => {
    vi.spyOn(api, 'githubRelated').mockResolvedValue({ status: 'ok', repositories: [repo()], summary: { retrieved: 7 } })
    render(<GithubProjects projectId="p1" />)
    expect(screen.getByText('Finding related GitHub projects...')).toBeInTheDocument()
    const card = await screen.findByRole('article', { name: /octo\/plant-disease-detection/ })
    expect(within(card).getByText('91%')).toBeInTheDocument(); expect(within(card).getByText('Python')).toBeInTheDocument(); expect(within(card).getByLabelText('1,200 stars')).toBeInTheDocument(); expect(within(card).getByLabelText('30 forks')).toBeInTheDocument()
    expect(within(card).getByText('octo/plant-disease-detection', { exact: false })).toBeInTheDocument(); expect(within(card).getByText('cnn')).toBeInTheDocument(); expect(within(card).getByText(/Updated/)).toBeInTheDocument()
    const link = within(card).getByRole('link', { name: /View on GitHub/ })
    expect(link).toHaveAttribute('href', 'https://github.com/octo/plant-disease-detection'); expect(link).toHaveAttribute('target', '_blank'); expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
  test('never renders a link for non-GitHub or malformed URLs', () => {
    expect(isGithubUrl('https://github.com/a/b')).toBe(true)
    for (const bad of ['http://github.com/a/b', 'https://evil.com/a/b', 'javascript:alert(1)', undefined]) expect(isGithubUrl(bad)).toBe(false)
    render(<RepoCard repo={repo({ url: 'https://evil.example.com/a/b' })} />)
    expect(screen.queryByRole('link')).toBeNull(); expect(screen.getByText('Link unavailable')).toBeInTheDocument()
  })
  test('failure shows the friendly message (no 500) and Try Again retries', async () => {
    const spy = vi.spyOn(api, 'githubRelated').mockResolvedValueOnce({ status: 'unavailable', message: 'GitHub projects could not be loaded right now.', retryable: true, repositories: [] }).mockResolvedValueOnce({ status: 'ok', repositories: [repo()] })
    render(<GithubProjects projectId="p1" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub projects could not be loaded right now.'); expect(screen.queryByText(/500|Internal/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(await screen.findByRole('article', { name: /plant-disease-detection/ })).toBeInTheDocument(); expect(spy).toHaveBeenCalledTimes(2); expect(spy.mock.calls[1][1].refresh).toBe(true)
  })
  test('network exception is also handled gracefully', async () => {
    vi.spyOn(api, 'githubRelated').mockRejectedValue(new Error('Cannot reach the server.'))
    render(<GithubProjects projectId="p1" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub projects could not be loaded right now.')
  })
  test('empty results show an empty state; extra repositories load with Show more', async () => {
    vi.spyOn(api, 'githubRelated').mockResolvedValueOnce({ status: 'empty', message: 'No related GitHub repositories were found for this idea.', repositories: [] })
    const { unmount } = render(<GithubProjects projectId="p1" />)
    expect(await screen.findByText('No related repositories found')).toBeInTheDocument(); unmount()
    vi.spyOn(api, 'githubRelated').mockResolvedValue({ status: 'ok', repositories: many(12) })
    render(<GithubProjects projectId="p2" />)
    await screen.findByRole('article', { name: /o\/repo-0/ }); expect(screen.getAllByRole('article')).toHaveLength(8)
    await userEvent.click(screen.getByRole('button', { name: /Show more \(4 more\)/ })); expect(screen.getAllByRole('article')).toHaveLength(12)
  })
  test('layout is responsive (1 column on mobile, more on larger screens)', async () => {
    vi.spyOn(api, 'githubRelated').mockResolvedValue({ status: 'ok', repositories: many(2) })
    render(<GithubProjects projectId="p1" />)
    const grid = (await screen.findAllByRole('article'))[0].parentElement
    expect(grid.className).toMatch(/grid-cols-1/); expect(grid.className).toMatch(/md:grid-cols-2/)
  })
})

const comps = { github_uniqueness: { score: 91, explanation: 'Closest repo is 40% similar', evidence: [{ title: 'o/x', url: 'https://github.com/o/x' }] }, feature_uniqueness: { score: 84, explanation: 'f', evidence: [] },
  research_uniqueness: { score: null, explanation: 'Information unavailable: research sources could not be queried.', evidence: [] }, technology_novelty: { score: 90, explanation: 't', evidence: [] }, market_differentiation: { score: 82, explanation: 'm', evidence: [] } }
describe('novelty, reality, quality', () => {
  test('novelty score shows overall, every component with explanation, and "Information unavailable"', () => {
    render(<NoveltyBreakdown novelty={{ overall: 87, components: comps, confidence: 'medium', methodology: 'weighted mean', disclaimer: 'Estimated only.' }} />)
    expect(screen.getByLabelText('Overall novelty: 87')).toBeInTheDocument(); expect(screen.getByText('GitHub uniqueness')).toBeInTheDocument(); expect(screen.getByText('91/100')).toBeInTheDocument()
    expect(screen.getAllByText(/Information unavailable/).length).toBeGreaterThanOrEqual(1); expect(screen.getByText('Closest repo is 40% similar')).toBeInTheDocument(); expect(screen.getByText('Estimated only.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'o/x' })).toHaveAttribute('rel', 'noopener noreferrer')
  })
  test('reality check shows status, counts, closest match and recommendation', () => {
    render(<RealityCheck reality={{ status: 'yellow', icon: '🟡', label: 'Similar projects exist', similarGithubCount: 4, retrievedGithubCount: 15, activeSimilarCount: 3, similarPapersCount: 2, technicalCommonness: 'Moderately common',
      closestMatch: { name: 'o/resume-analyzer', url: 'https://github.com/o/resume-analyzer', similarity: 78 }, commonFeatures: ['Personalization (3 of 9 sources)'], lessExplored: ['Multilingual support'], recommendation: 'Add multilingual analysis.', methodology: 'Yellow: closest >=45%' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Similar projects exist'); expect(screen.getByText('4')).toBeInTheDocument(); expect(screen.getByText('78% similar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'o/resume-analyzer' })).toHaveAttribute('href', 'https://github.com/o/resume-analyzer'); expect(screen.getByText(/Add multilingual analysis/)).toBeInTheDocument(); expect(screen.getByText('Multilingual support')).toBeInTheDocument()
  })
  test('ProjectForge score lists all six components, weights and the formula', () => {
    const c = (s) => ({ score: s, explanation: `e${s}` })
    render(<QualityScore quality={{ final: 91, noveltyVerified: false, formula: 'Final = 25% novelty + ...', weights: { novelty: 0.25, technical_depth: 0.15, industry_relevance: 0.2, research_potential: 0.15, feasibility: 0.15, portfolio_value: 0.1 },
      components: { novelty: c(91), technical_depth: c(88), industry_relevance: c(94), research_potential: c(90), feasibility: c(86), portfolio_value: c(93) } }} />)
    for (const l of ['Novelty', 'Technical depth', 'Industry relevance', 'Research potential', 'Feasibility', 'Portfolio value']) expect(screen.getAllByText(new RegExp(l))[0]).toBeInTheDocument()
    expect(screen.getByLabelText('Final score: 91')).toBeInTheDocument(); expect(screen.getByText(/How it is calculated/)).toBeInTheDocument(); expect(screen.getByText(/unverified prior/)).toBeInTheDocument()
  })
  test('differentiation shows why / difficulty / originality gain and triggers actions', async () => {
    const onGenerate = vi.fn(), onImprove = vi.fn()
    render(<Differentiation data={{ note: 'Template suggestions', suggestions: [{ id: 'a', feature: 'Explainable AI', why: 'Builds trust', technical_difficulty: 'Medium', expected_originality_improvement: { points: 8, basis: 'not mentioned in any of 12 retrieved sources' }, origin: 'template' }] }} onGenerate={onGenerate} onImprove={onImprove} />)
    expect(screen.getByText('Explainable AI')).toBeInTheDocument(); expect(screen.getByText(/Builds trust/)).toBeInTheDocument(); expect(screen.getByText('Medium difficulty')).toBeInTheDocument(); expect(screen.getByText('+8 originality (est.)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Generate improved version/ })); expect(onImprove).toHaveBeenCalled()
  })
})

describe('research', () => {
  const paper = { title: 'Plant disease detection with CNN', authors: ['A. Researcher'], year: 2023, venue: 'Journal of Test', doi: '10.1234/plant.1', link: 'https://doi.org/10.1234/plant.1', source: 'openalex', relevanceScore: 80,
    methodology: { text: 'We propose a CNN approach.' }, dataset: null, mainResult: { text: 'It achieves 95% accuracy.' }, limitations: null, futureWork: null }
  test('paper card shows real fields and "Information unavailable" for what the abstract lacks', () => {
    render(<PaperCard p={paper} />)
    expect(screen.getByText('We propose a CNN approach.')).toBeInTheDocument(); expect(screen.getByRole('link', { name: /10\.1234\/plant\.1/ })).toHaveAttribute('href', 'https://doi.org/10.1234/plant.1')
    expect(screen.getAllByText('Information unavailable').length).toBe(3)
  })
  test('research tab: loading, results with gap analysis, and failure with retry', async () => {
    const gap = { available: true, existing: [{ aspect: 'Explainable AI', papers: 1 }], gaps: [{ id: 'multilingual', aspect: 'Multilingual support', why: 'Mostly English-only' }], suggestedContribution: 'Build X with multilingual support.', caveat: 'Based on 1 retrieved paper abstracts.' }
    const spy = vi.spyOn(api, 'researchRelated').mockResolvedValueOnce({ status: 'unavailable', message: 'Research papers could not be loaded right now.', papers: [] }).mockResolvedValueOnce({ status: 'ok', papers: [paper], gap, note: 'Papers come from real sources.' })
    render(<ResearchPapers projectId="p1" />)
    expect(screen.getByText('Finding related research papers...')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Research papers could not be loaded right now.')
    await userEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(await screen.findByText('Plant disease detection with CNN')).toBeInTheDocument(); expect(screen.getByText('Research gap analysis')).toBeInTheDocument(); expect(screen.getByText('What can your project improve?')).toBeInTheDocument(); expect(spy).toHaveBeenCalledTimes(2)
  })
  test('gap analysis without evidence says information unavailable instead of inventing gaps', () => {
    render(<GapAnalysis gap={{ available: false, reason: 'No research papers were retrieved, so research gaps cannot be assessed.' }} />)
    expect(screen.getByText(/Information unavailable: No research papers were retrieved/)).toBeInTheDocument(); expect(screen.queryByText('Potential gaps')).toBeNull()
  })
})

describe('blueprint, roadmap, feasibility', () => {
  const b = { title: 'My Project', origin: 'template', one_line_idea: 'idea', problem_statement: 'p', proposed_solution: 's', objectives: ['o'], target_users: ['u'], key_features: ['k'], unique_features: ['uf'], existing_system_limitations: ['l'], proposed_system_advantages: ['a'],
    architecture: { overview: 'ov', layers: [{ name: 'Client', components: ['UI'] }] }, technology_stack: { frontend: ['React'], backend: ['Node'], database: ['MongoDB'], ai_ml: ['CNN'], devops: ['Docker'] }, frontend: ['f'], backend: ['b'], database: ['d'], ai_ml_components: ['CNN'],
    apis: [{ method: 'POST', path: '/api/x', purpose: 'run' }], dataset_requirements: ['dr'], security: ['s'], testing: ['t'], deployment: ['dep'], future_enhancements: ['fe'] }
  test('blueprint renders all 22 sections (including APIs)', () => {
    expect(SECTIONS(b)).toHaveLength(22)
    render(<BlueprintView blueprint={b} />)
    expect(screen.getAllByText(/^\d+\. /)).toHaveLength(22); expect(screen.getByText('POST /api/x - run', { exact: false })).toBeInTheDocument(); expect(screen.getByText(/not verified facts/)).toBeInTheDocument()
  })
  test('weekly roadmap lists weeks, focus, tasks and deliverables', () => {
    render(<WeeklyPlan plan={{ totalWeeks: 2, teamSize: 3, notes: ['Run Backend and Frontend in parallel.'], weeks: [{ week: 1, focus: ['Requirements', 'Research'], tasks: ['Define scope'], deliverables: ['Requirements doc'] }, { week: 2, focus: ['Backend'], tasks: ['Build API'], deliverables: [] }] }} />)
    expect(screen.getByText('Week 1')).toBeInTheDocument(); expect(screen.getByText('Requirements + Research')).toBeInTheDocument(); expect(screen.getByText(/Deliverable: Requirements doc/)).toBeInTheDocument(); expect(screen.getByText(/team of 3/)).toBeInTheDocument()
  })
  test('feasibility card shows time, GPU, dataset availability and cost', () => {
    render(<FeasibilityCard f={{ score: 80, explanation: 'ok', difficulty: 'Medium', estimatedTime: { label: '5-7 weeks', basis: 'x' }, requiredSkills: ['React'], skillsToLearn: ['PyTorch'], hardware: { required: [], gpu: 'Optional' },
      dataset: { availability: 'Information unavailable. Verify datasets yourself.', references: [] }, apiDependencies: [], cloud: ['Cloud API'], cost: { level: 'Low', usd: 30, inr: 2550, note: 'rough' }, deploymentDifficulty: 'Low' }} />)
    expect(screen.getByText(/5-7 weeks/)).toBeInTheDocument(); expect(screen.getByText(/GPU: Optional/)).toBeInTheDocument(); expect(screen.getByText(/Information unavailable/)).toBeInTheDocument(); expect(screen.getByText(/You may need to learn: PyTorch/)).toBeInTheDocument()
  })
})

describe('save and compare', () => {
  test('save and favorite buttons on a project card call their handlers', async () => {
    const onSave = vi.fn(), onFavorite = vi.fn()
    render(<MemoryRouter><ProjectCard p={{ id: '1', title: 'T', short_description: 'd', domain: 'AI/ML', difficulty: 'beginner', version: 1, progress: 'building', is_saved: false, is_favorite: false, scores: { overall: 80, novelty_verified: false, scores: { novelty: 70, feasibility: 75, career_relevance: 88 } } }} onSave={onSave} onFavorite={onFavorite} /></MemoryRouter>)
    expect(screen.getByText('building')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' })); await userEvent.click(screen.getByRole('button', { name: 'Add favorite' }))
    expect(onSave).toHaveBeenCalled(); expect(onFavorite).toHaveBeenCalled()
  })
  test('compare page shows the extra metrics and a recommended project with its reason', async () => {
    vi.spyOn(api, 'listProjects').mockResolvedValue({ projects: [{ id: 'a', title: 'Project A' }, { id: 'b', title: 'Project B' }] })
    const row = (id, t, o) => ({ id, title: t, novelty: 80, novelty_verified: true, difficulty: 60, cost_usd: 30, time_weeks: 8, required_skills: ['React'], career_value: 80, research_potential: 70, market_potential: 70, ai_complexity: 60, deployment_complexity: 40, overall: 75, industry: 75, portfolio_value: 82, github_similarity: 40, projectforge_score: 88, cost_level: 'Low', ...o })
    vi.spyOn(api, 'compare').mockResolvedValue({ projects: [row('a', 'Project A', {}), row('b', 'Project B', { projectforge_score: 70 })], recommended: { id: 'a', title: 'Project A', reason: 'Project A has the highest ProjectForge Score 88 and leads on novelty.' } })
    render(<MemoryRouter initialEntries={['/compare?ids=a,b']}><Compare /></MemoryRouter>)
    const rec = await screen.findByLabelText('Recommended project')
    expect(rec).toHaveTextContent('Project A'); expect(rec).toHaveTextContent(/highest ProjectForge Score 88/)
    for (const l of ['Portfolio value', 'GitHub similarity', 'ProjectForge score', 'Industry relevance', 'Cost level']) expect(screen.getByText(l)).toBeInTheDocument()
    expect(api.compare).toHaveBeenCalledWith(['a', 'b'])
  })
})

describe('papers without abstracts', () => {
  test('say so once instead of repeating "Information unavailable"', () => {
    render(<PaperCard p={{ title: 'No abstract paper', authors: [], year: 2021, venue: 'J', doi: null, link: 'https://doi.org/10.1/x', source: 'crossref', relevanceScore: 48, hasAbstract: false, methodology: null, dataset: null, mainResult: null, limitations: null, futureWork: null }} />)
    expect(screen.getByText(/crossref did not provide an abstract/)).toBeInTheDocument(); expect(screen.queryByText('Methodology')).toBeNull()
  })
})
