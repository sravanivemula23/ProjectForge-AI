import { HttpError } from '../utils/httpError.js'
import { logUsage } from '../utils/usage.js'

export const notFoundHandler = (_req, res) => res.status(404).json({ detail: 'Route not found' })

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ detail: err.message })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ detail: 'Malformed JSON body' })
  if (err?.type === 'entity.too.large') return res.status(413).json({ detail: 'Request body too large' })
  if (err?.code === 11000) return res.status(409).json({ detail: 'That record already exists' })
  console.error(`[error] ${req.method} ${req.path}:`, err)
  logUsage('error', req.path.slice(0, 80), false, 0, `${err?.name}: ${err?.message}`)
  res.status(500).json({ detail: 'Something went wrong on our side. Please try again.' })
}
