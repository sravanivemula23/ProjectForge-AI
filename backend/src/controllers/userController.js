import { PROFILE_FIELDS } from '../models/index.js'
import { userOut } from '../utils/serialize.js'

export const profileOf = (u) => ({
  ...Object.fromEntries(PROFILE_FIELDS.map((k) => [k, u.profile?.[k] ?? (Array.isArray(u.profile?.[k]) ? [] : '')])),
  academic_requirement: u.profile?.academic_requirement ?? '', research_interest: u.profile?.research_interest ?? [],
})

/** Same rule as the Python version: empty strings/lists and the default 'beginner' do not count (experience level always counts). */
export function profileCompletion(u) {
  if (!u.profile) return 0
  const filled = PROFILE_FIELDS.filter((k) => {
    const v = u.profile[k]
    const empty = v == null || v === '' || (Array.isArray(v) && v.length === 0) || v === 'beginner'
    return !empty || (k === 'experience_level' && !!v)
  }).length
  return Math.round((100 * filled) / PROFILE_FIELDS.length)
}

export const me = (req, res) => res.json({ ...userOut(req.user), profile: profileOf(req.user), profile_completion: profileCompletion(req.user) })

export async function updateMe(req, res) {
  req.user.name = req.body.name.trim()
  await req.user.save()
  res.json(userOut(req.user))
}

export async function updateProfile(req, res) {
  req.user.profile = req.body
  await req.user.save()
  res.json({ profile: profileOf(req.user), profile_completion: profileCompletion(req.user) })
}
