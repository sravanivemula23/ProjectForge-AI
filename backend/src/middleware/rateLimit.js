import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

const make = (limit) => (limit > 0
  ? rateLimit({ windowMs: 60_000, limit, standardHeaders: true, legacyHeaders: false,
      handler: (_req, res) => res.status(429).set('Retry-After', '60').json({ detail: 'Too many requests. Please wait a minute and try again.' }) })
  : (_req, _res, next) => next())

/** In-memory limiter (per IP). Use a shared store such as Redis if you run several instances. */
export const apiLimiter = make(env.rateLimitPerMinute)
export const authLimiter = make(env.authRateLimitPerMinute)

/** Per-user limiters protect paid/limited upstream APIs (must be mounted after `authenticate`). */
export const perUserLimiter = (limit, message) => (limit > 0
  ? rateLimit({ windowMs: 60_000, limit, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => String(req.user?._id || 'anon'),
      handler: (_req, res) => res.status(429).set('Retry-After', '60').json({ detail: message }) })
  : (_req, _res, next) => next())
export const githubLimiter = perUserLimiter(env.githubRateLimitPerMinute, 'Too many GitHub lookups. Please wait a minute and try again.')
export const researchLimiter = perUserLimiter(env.researchRateLimitPerMinute, 'Too many research lookups. Please wait a minute and try again.')
export const aiLimiter = perUserLimiter(env.aiRateLimitPerMinute, 'Too many analysis requests. Please wait a minute and try again.')
