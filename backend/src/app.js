import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { env, isProd } from './config/env.js'
import { apiLimiter } from './middleware/rateLimit.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'

export function createApp() {
  if (env.jwtSecret === 'change-me-in-production' && isProd) throw new Error('Set a strong JWT_SECRET before running in production')
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({ origin: env.corsOrigins, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use('/api', apiLimiter, routes)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
