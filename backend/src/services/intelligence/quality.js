/** PROJECTFORGE SCORE. Final = 0.25 novelty + 0.15 technical depth + 0.20 industry + 0.15 research + 0.15 feasibility + 0.10 portfolio.
 *  technical depth = 0.6 technical complexity + 0.4 difficulty; industry = 0.6 market potential + 0.4 career relevance;
 *  research = research potential (+5 when >=2 research gaps were found); portfolio = 0.35 career + 0.25 novelty + 0.25 depth + 0.15 industry. */
import { scoreProject } from '../scoring/index.js'
import { clamp100 } from '../../utils/pyRound.js'

export const QUALITY_WEIGHTS = { novelty: 0.25, technical_depth: 0.15, industry_relevance: 0.2, research_potential: 0.15, feasibility: 0.15, portfolio_value: 0.1 }

export function computeQuality(c, { profile = {}, prefs = {}, novelty = null, feasibility, gap = null } = {}) {
  const sc = scoreProject({ ...c.data, title: c.title, short_description: c.short_description, domain: c.domain, difficulty: c.difficulty }, profile, prefs).scores
  const verified = novelty?.overall != null
  const nov = verified ? novelty.overall : sc.novelty
  const depth = clamp100(0.6 * feasibility.technicalComplexity + 0.4 * sc.difficulty)
  const industry = clamp100(0.6 * sc.market_potential + 0.4 * sc.career_relevance)
  const research = clamp100(sc.research_potential + (gap?.available && gap.gaps.length >= 2 ? 5 : 0))
  const portfolio = clamp100(0.35 * sc.career_relevance + 0.25 * nov + 0.25 * depth + 0.15 * industry)
  const components = {
    novelty: { score: nov, explanation: verified ? `Novelty breakdown from retrieved GitHub/paper evidence (confidence: ${novelty.confidence}).` : 'Unverified prior; run the novelty analysis to base this on evidence.' },
    technical_depth: { score: depth, explanation: `Technical complexity ${feasibility.technicalComplexity} and difficulty ${sc.difficulty}.` },
    industry_relevance: { score: industry, explanation: `Market potential ${sc.market_potential} and career relevance ${sc.career_relevance}.` },
    research_potential: { score: research, explanation: `Research potential ${sc.research_potential}${research > sc.research_potential ? ' plus a bonus for identified research gaps' : ''}.` },
    feasibility: { score: feasibility.score, explanation: feasibility.explanation },
    portfolio_value: { score: portfolio, explanation: 'Blend of career relevance, novelty, technical depth and industry relevance.' },
  }
  const final = clamp100(Object.entries(QUALITY_WEIGHTS).reduce((s, [k, w]) => s + components[k].score * w, 0))
  return { final, components, weights: QUALITY_WEIGHTS, noveltyVerified: verified,
    formula: 'Final = 25% novelty + 15% technical depth + 20% industry relevance + 15% research potential + 15% feasibility + 10% portfolio value.' }
}
