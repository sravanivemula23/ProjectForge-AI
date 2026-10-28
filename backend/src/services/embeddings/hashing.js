// Deterministic lexical embedder (port of the Python HashingEmbedder; produces identical vectors).
export const DIM = 384
export const STOPWORDS = new Set(('a an the and or of for to in on with using based by from into via is are be as at this that it its their our your ' +
  'system project application app platform model approach new smart intelligent use used can will').split(' '))

const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
export function crc32(str) {
  let c = 0xffffffff
  for (const b of Buffer.from(str, 'utf8')) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function tokenize(text) {
  const out = []
  for (const m of text.toLowerCase().matchAll(/[a-z0-9][a-z0-9\-+.#]*/g)) {
    const t = m[0].replace(/^[.-]+|[.-]+$/g, '')
    if (t && !STOPWORDS.has(t)) out.push(t)
  }
  return out
}

const normalize = (v) => { const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1; return v.map((x) => x / n) }

export class HashingEmbedder {
  name = 'hashing-384 (lexical fallback)'
  lo = 0.05
  hi = 0.55
  async embed(texts) {
    return texts.map((text) => {
      const vec = new Array(DIM).fill(0)
      const toks = tokenize(text)
      const feats = [...toks, ...toks.slice(0, -1).map((a, i) => `${a}_${toks[i + 1]}`)]
      const counts = new Map()
      for (const f of feats) counts.set(f, (counts.get(f) || 0) + 1)
      for (const [f, c] of counts) {
        const h = crc32(f)
        vec[h % DIM] += ((h >>> 31) & 1 ? 1 : -1) * (1 + Math.log(c)) * (f.includes('_') ? 1.5 : 1)
      }
      return normalize(vec)
    })
  }
}
