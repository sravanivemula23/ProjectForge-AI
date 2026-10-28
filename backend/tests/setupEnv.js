// Runs before any test module is imported, so config/env.js sees these values.
process.env.NODE_ENV = 'development'
process.env.AI_PROVIDER = 'none'
process.env.AI_API_KEY = ''
process.env.EMBEDDING_BACKEND = 'hashing'
process.env.RATE_LIMIT_PER_MINUTE = '0'
process.env.AUTH_RATE_LIMIT_PER_MINUTE = '0'
process.env.VECTOR_SEARCH = 'off'
process.env.AUTO_SEED = 'false'
process.env.GITHUB_RATE_LIMIT_PER_MINUTE = '0'
process.env.RESEARCH_RATE_LIMIT_PER_MINUTE = '0'
process.env.AI_RATE_LIMIT_PER_MINUTE = '0'
// Safety net: automated tests must never reach real external services (GitHub, research APIs, LLMs). Tests stub fetch explicitly.
globalThis.fetch = async (url) => { throw new Error(`Real network calls are disabled in tests: ${url}`) }
process.env.SEARCH_RETRY_DELAY_MS = '0'
