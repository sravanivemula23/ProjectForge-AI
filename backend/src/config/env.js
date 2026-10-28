import 'dotenv/config'

const bool = (v, d) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()))
const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v))
const e = process.env

export const env = {
  nodeEnv: e.NODE_ENV || 'development',
  port: num(e.PORT, 8000),
  // Use "memory" to start a throw-away in-memory MongoDB (dev/tests only; no Vector Search).
  mongoUri: e.MONGODB_URI || 'mongodb://127.0.0.1:27017/projectforge?directConnection=true',
  jwtSecret: e.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: e.JWT_EXPIRES_IN || '1d',
  corsOrigins: (e.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  rateLimitPerMinute: num(e.RATE_LIMIT_PER_MINUTE, 120),
  authRateLimitPerMinute: num(e.AUTH_RATE_LIMIT_PER_MINUTE, 20),

  ai: { provider: (e.AI_PROVIDER || 'anthropic').toLowerCase(), apiKey: e.AI_API_KEY || '', model: e.AI_MODEL || 'claude-sonnet-5-5', baseUrl: e.AI_BASE_URL || '' },
  embeddingBackend: (e.EMBEDDING_BACKEND || 'hashing').toLowerCase(), // hashing | transformers
  embeddingModel: e.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
  vectorSearch: (e.VECTOR_SEARCH || 'auto').toLowerCase(), // auto | on | off
  vectorIndexName: e.VECTOR_INDEX_NAME || 'embedding_index',

  githubToken: e.GITHUB_TOKEN || '',
  githubCacheTtlHours: num(e.GITHUB_CACHE_TTL_HOURS, 12),
  researchCacheTtlHours: num(e.RESEARCH_CACHE_TTL_HOURS, 24),
  githubRateLimitPerMinute: num(e.GITHUB_RATE_LIMIT_PER_MINUTE, 10),
  researchRateLimitPerMinute: num(e.RESEARCH_RATE_LIMIT_PER_MINUTE, 15),
  aiRateLimitPerMinute: num(e.AI_RATE_LIMIT_PER_MINUTE, 20),
  inrPerUsd: num(e.INR_PER_USD, 85),
  semanticScholarKey: e.SEMANTIC_SCHOLAR_API_KEY || '',
  openalexKey: e.OPENALEX_API_KEY || '',
  openalexMailto: e.OPENALEX_MAILTO || '',
  crossrefMailto: e.CROSSREF_MAILTO || '',
  searchTimeoutMs: num(e.SEARCH_TIMEOUT_SECONDS, 20) * 1000,
  searchRetryDelayMs: num(e.SEARCH_RETRY_DELAY_MS, 700),

  autoSeed: bool(e.AUTO_SEED, true),
  seed: {
    adminEmail: e.SEED_ADMIN_EMAIL || 'admin@projectforge.ai',
    adminPassword: e.SEED_ADMIN_PASSWORD || 'Admin@12345',
    demoEmail: e.SEED_DEMO_EMAIL || 'demo@projectforge.ai',
    demoPassword: e.SEED_DEMO_PASSWORD || 'Demo@12345',
  },
}
export const isProd = env.nodeEnv === 'production'
export const EMBEDDING_DIM = 384
