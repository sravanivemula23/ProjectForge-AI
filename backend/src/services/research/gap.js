import { ASPECTS, aspectContext, aspectPresentIn } from '../intelligence/aspects.js'

/** Research-gap analysis from RETRIEVED papers/repositories only. Returns null gap claims when there is no evidence. */
export function analyzeResearchGap(c, papers, repos) {
  const corpus = [...papers.map((p) => ({ kind: 'paper', title: p.title, text: `${p.title} ${p.abstract}`.toLowerCase() })), ...repos.map((r) => ({ kind: 'repo', title: r.fullName, text: `${r.name} ${r.description} ${(r.topics || []).join(' ')}`.toLowerCase() }))]
  if (!papers.length) return { available: false, reason: papers.length === 0 && repos.length ? 'No research papers were retrieved, so research gaps cannot be assessed.' : 'No research papers were retrieved, so research gaps cannot be assessed.', existing: [], gaps: [], suggestedContribution: null, evidenceCount: 0 }
  const ctx = aspectContext(c)
  const existing = [], gaps = []
  for (const a of ASPECTS) {
    const inPapers = corpus.filter((x) => x.kind === 'paper' && aspectPresentIn(a, x.text))
    const inRepos = corpus.filter((x) => x.kind === 'repo' && aspectPresentIn(a, x.text))
    if (inPapers.length) existing.push({ aspect: a.label, papers: inPapers.length, examples: inPapers.slice(0, 2).map((x) => x.title) })
    else if (a.applies(ctx) && !aspectPresentIn(a, `${c.title} ${c.short_description} ${c.modules.join(' ')} ${c.innovation_opportunities.join(' ')}`.toLowerCase())) gaps.push({ aspect: a.label, id: a.id, inRepositories: inRepos.length, why: a.why })
  }
  const top = gaps.slice(0, 3)
  const suggestedContribution = top.length ? `Build ${c.title} with ${top.map((g) => g.aspect.toLowerCase()).join(', ')}: none of the ${papers.length} retrieved papers mention ${top.length > 1 ? 'these aspects' : 'this aspect'}.` : null
  return { available: true, evidenceCount: papers.length, existing: existing.slice(0, 8), gaps: gaps.slice(0, 8), suggestedContribution, origin: 'derived_from_retrieved_papers',
    caveat: `Based on ${papers.length} retrieved paper abstracts. A gap means "not mentioned in these abstracts", not proof that no research exists.` }
}
