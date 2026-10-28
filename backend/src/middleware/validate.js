import { HttpError } from '../utils/httpError.js'

export const validate = (schema) => (req, _res, next) => {
  const r = schema.safeParse(req.body ?? {})
  if (!r.success) {
    const msgs = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    return next(new HttpError(422, `Please check your input. ${msgs.join('; ')}`))
  }
  req.body = r.data
  next()
}

export const validateQuery = (schema) => (req, _res, next) => {
  const r = schema.safeParse(req.query ?? {})
  if (!r.success) return next(new HttpError(422, `Please check your input. ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`))
  req.validQuery = r.data
  next()
}

/** Invalid ObjectIds behave like missing resources (404), as before. */
export const validateId = (what = 'Project') => (req, _res, next, id) =>
  (/^[a-f0-9]{24}$/i.test(id) ? next() : next(new HttpError(404, `${what} not found`)))
