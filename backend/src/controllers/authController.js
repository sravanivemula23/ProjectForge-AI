import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { User, PasswordResetToken } from '../models/index.js'
import { signToken } from '../middleware/auth.js'
import { HttpError } from '../utils/httpError.js'
import { userOut } from '../utils/serialize.js'
import { env } from '../config/env.js'

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

export async function register(req, res) {
  const { name, email, password } = req.body
  if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'An account with this email already exists')
  const user = await User.create({ name, email, password_hash: await bcrypt.hash(password, 10) })
  res.status(201).json({ access_token: signToken(user), token_type: 'bearer', user: userOut(user) })
}

export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password_hash')
  if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) throw new HttpError(401, 'Incorrect email or password')
  if (!user.is_active) throw new HttpError(403, 'This account has been disabled')
  user.last_login_at = new Date()
  await user.save()
  res.json({ access_token: signToken(user), token_type: 'bearer', user: userOut(user) })
}

// Stateless JWT: the client discards the token. (Add a denylist for server-side revocation.)
export const logout = (_req, res) => res.json({ ok: true })

/** Password-reset architecture. A real deployment would email the link; the raw token is only returned in development. */
export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() })
  const resp = { message: 'If that email exists, a reset link has been sent.' }
  if (user) {
    const raw = crypto.randomBytes(32).toString('base64url')
    await PasswordResetToken.create({ user_id: user._id, token_hash: sha256(raw), expires_at: new Date(Date.now() + 30 * 60 * 1000) })
    if (env.nodeEnv === 'development') resp.dev_reset_token = raw
  }
  res.json(resp)
}

export async function resetPassword(req, res) {
  const tok = await PasswordResetToken.findOne({ token_hash: sha256(req.body.token) })
  if (!tok || tok.used || tok.expires_at < new Date()) throw new HttpError(400, 'Reset token is invalid or expired')
  await User.updateOne({ _id: tok.user_id }, { password_hash: await bcrypt.hash(req.body.password, 10) })
  tok.used = true
  await tok.save()
  res.json({ message: 'Password updated' })
}
