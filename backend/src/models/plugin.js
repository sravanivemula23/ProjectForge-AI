import mongoose from 'mongoose'

/** API-compatible JSON: `_id` -> `id`, drop `__v`, snake_case timestamps (keeps the frontend contract unchanged). */
export const apiJson = (schema) => {
  schema.set('toJSON', { virtuals: false, versionKey: false, transform: (_d, ret) => { ret.id = String(ret._id); delete ret._id; return ret } })
}
export const ts = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, minimize: false }
export const ref = (model, extra = {}) => ({ type: mongoose.Schema.Types.ObjectId, ref: model, ...extra })
export const { Schema, model } = mongoose
export { mongoose }
