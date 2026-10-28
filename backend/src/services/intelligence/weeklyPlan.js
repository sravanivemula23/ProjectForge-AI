/** Adaptive week-by-week plan derived from the roadmap phases, team size and AI/ML weight. Deterministic. */
export function buildWeeklyPlan(phases, { teamSize = 1, hasML = false } = {}) {
  const team = Math.max(1, Number(teamSize) || 1)
  const adj = phases.map((p) => Math.max(0.5, p.estimated_weeks / (team > 1 ? 1 + 0.25 * (team - 1) : 1) * (hasML && /AI\/ML|Dataset/.test(p.name) ? 1.15 : 1)))
  const total = Math.max(1, Math.ceil(adj.reduce((s, x) => s + x, 0)))
  const weeks = Array.from({ length: total }, (_, i) => ({ week: i + 1, focus: [], tasks: [], deliverables: [] }))
  let cursor = 0
  phases.forEach((p, i) => {
    const start = Math.min(total - 1, Math.floor(cursor)), end = Math.min(total - 1, Math.max(start, Math.ceil(cursor + adj[i]) - 1))
    for (let w = start; w <= end; w++) {
      if (!weeks[w].focus.includes(p.name)) weeks[w].focus.push(p.name)
      weeks[w].tasks.push(...p.tasks.slice(0, 2))
    }
    weeks[end].deliverables.push(p.expected_output)
    cursor += adj[i]
  })
  return { totalWeeks: total, teamSize: team, notes: [team >= 3 ? 'With 3+ members, run Backend and Frontend in parallel after System Design.' : team === 2 ? 'With 2 members, split Backend and Frontend after System Design.' : 'Solo: keep phases sequential and use the weekly deliverables as milestones.', hasML ? 'AI/ML and data phases are extended because the project depends on a trained model.' : 'No heavy ML phase: time shifts toward integration and testing.'], weeks }
}
