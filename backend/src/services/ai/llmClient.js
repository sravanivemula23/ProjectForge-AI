/** Thin LLM client: Anthropic Messages API or any OpenAI-compatible chat-completions endpoint. Keys stay server-side. */
import { env } from '../../config/env.js'
import { logUsage } from '../../utils/usage.js'

export class LLMUnavailable extends Error {}
export class LLMError extends Error {}

export const llmAvailable = () => env.ai.provider !== 'none' && !!env.ai.apiKey

export function extractJson(text) {
  const t = text.replace(/```(?:json)?/g, '').trim()
  const s = t.indexOf('{'), e = t.lastIndexOf('}')
  if (s === -1 || e <= s) throw new LLMError('Model response did not contain a JSON object')
  try { return JSON.parse(t.slice(s, e + 1)) } catch (err) { throw new LLMError(`Model returned invalid JSON: ${err.message}`) }
}

export async function completeJson(system, user, name, { maxTokens = 6000, userId = null } = {}) {
  if (!llmAvailable()) throw new LLMUnavailable('AI_API_KEY is not configured')
  const { provider, apiKey, model, baseUrl } = env.ai
  const start = performance.now()
  try {
    let res, text
    if (provider === 'anthropic') {
      res = await fetch(`${baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
        method: 'POST', signal: AbortSignal.timeout(120000),
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
      })
      if (!res.ok) throw new LLMError(`LLM provider returned HTTP ${res.status}`)
      text = ((await res.json()).content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    } else {
      res = await fetch(`${baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST', signal: AbortSignal.timeout(120000),
        headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      })
      if (!res.ok) throw new LLMError(`LLM provider returned HTTP ${res.status}`)
      text = (await res.json()).choices[0].message.content
    }
    const data = extractJson(text)
    await logUsage('ai', name, true, performance.now() - start, model, userId)
    return data
  } catch (err) {
    const e = err instanceof LLMError ? err : new LLMError(err.message)
    await logUsage('ai', name, false, performance.now() - start, e.message, userId)
    throw e
  }
}
