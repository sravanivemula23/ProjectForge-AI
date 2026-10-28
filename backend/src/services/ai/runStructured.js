import { completeJson, llmAvailable, LLMError, LLMUnavailable } from './llmClient.js'

export const SYSTEM =
  'You are ProjectForge AI, an assistant for student project planning. Respond with ONE JSON object only, no prose, no markdown fences. Never invent URLs, paper titles, ' +
  "citations, repositories or statistics. Never claim an idea is completely unique; use 'estimated' and 'potential' language. Be concrete and technically accurate."

/** Ask the LLM for JSON, validate with zod (one retry), otherwise use the deterministic fallback.
 *  Returns { data, origin: 'llm'|'template', error }. */
export async function runStructured(name, prompt, schema, fallback, userId = null) {
  if (!llmAvailable()) return { data: await fallback(), origin: 'template', error: null }
  let lastErr = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const hint = attempt === 0 ? '' : `\n\nYour previous reply failed validation: ${lastErr}. Return corrected JSON only.`
      const raw = await completeJson(SYSTEM, prompt + hint, name, { userId })
      const parsed = schema.safeParse(raw)
      if (parsed.success) return { data: parsed.data, origin: 'llm', error: null }
      lastErr = parsed.error.issues.slice(0, 4).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    } catch (err) {
      if (err instanceof LLMError || err instanceof LLMUnavailable) { lastErr = err.message; break }
      throw err
    }
  }
  return { data: await fallback(), origin: 'template', error: `AI unavailable or invalid response (${lastErr}); used built-in templates.` }
}
