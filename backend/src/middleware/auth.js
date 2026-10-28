import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/index.js'
import { HttpError, asyncHandler } from '../utils/httpError.js'

export const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn })

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Not authenticated')
  let payload
  try { payload = jwt.verify(header.slice(7), env.jwtSecret, { algorithms: ['HS256'] }) } catch { throw new HttpError(401, 'Invalid or expired token') }
  const user = /^[a-f0-9]{24}$/i.test(payload.sub) ? await User.findById(payload.sub) : null
  if (!user || !user.is_active) throw new HttpError(401, 'Account not found or disabled')
  req.user = user
  next()
})

export const requireAdmin = (req, _res, next) => (req.user?.role === 'admin' ? next() : next(new HttpError(403, 'Admin access required')))
