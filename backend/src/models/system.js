import { Schema, model, apiJson, ref } from './plugin.js'

const usage = new Schema({
  kind: { type: String, enum: ['ai', 'search', 'error'], index: true }, name: { type: String, index: true },
  success: { type: Boolean, default: true }, latency_ms: { type: Number, default: 0 }, detail: { type: String, default: '' },
  user_id: { type: Schema.Types.ObjectId, default: null }, created_at: { type: Date, default: Date.now },
}, { minimize: false })
usage.index({ created_at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }) // keep 90 days of logs
apiJson(usage)
export const UsageLog = model('UsageLog', usage)

const reset = new Schema({ user_id: ref('User', { required: true }), token_hash: { type: String, unique: true }, expires_at: Date, used: { type: Boolean, default: false } })
reset.index({ expires_at: 1 }, { expireAfterSeconds: 0 }) // MongoDB deletes expired tokens itself
apiJson(reset)
export const PasswordResetToken = model('PasswordResetToken', reset)
