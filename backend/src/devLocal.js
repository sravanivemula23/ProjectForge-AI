// `npm run dev:local`: starts the API against a throw-away in-memory MongoDB (no install needed).
// Vector Search is unavailable in this mode; the in-process similarity fallback is used.
process.env.MONGODB_URI ||= 'memory'
await import('./server.js')
