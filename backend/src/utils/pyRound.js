/** Round half to even (Python's round()) so scores match the original implementation exactly. */
export function pyRound(x) {
  const f = Math.floor(x), d = x - f
  if (d === 0.5) return f % 2 === 0 ? f : f + 1
  return Math.round(x)
}
export const round1 = (x) => Math.round(x * 10) / 10
export const clamp100 = (x) => Math.max(0, Math.min(100, pyRound(x)))
