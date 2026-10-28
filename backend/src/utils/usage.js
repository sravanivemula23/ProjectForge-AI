import mongoose from 'mongoose'
import { UsageLog } from '../models/index.js'

/** Best-effort usage/error logging (powers the admin dashboard). Never throws. */
export async function logUsage(kind, name, success = true, latencyMs = 0, detail = '', userId = null) {
  if (mongoose.connection.readyState !== 1) return // never block a request on logging when the DB is unavailable
  try { await UsageLog.create({ kind, name, success, latency_ms: Math.round(latencyMs), detail: String(detail).slice(0, 2000), user_id: userId }) } catch { /* ignore */ }
}

export async function timed(kind, name, userId, fn) {
  const start = performance.now()
  try {
    const out = await fn()
    await logUsage(kind, name, true, performance.now() - start, '', userId)
    return out
  } catch (err) {
    await logUsage(kind, name, false, performance.now() - start, `${err.name}: ${err.message}`, userId)
    throw err
  }
}
