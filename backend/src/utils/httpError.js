export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`)
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
