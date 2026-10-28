import { readFileSync } from 'node:fs'

/** 12 built-in project templates (offline fallback + seed/demo data). NOT claims about real external projects. */
export const CATALOG = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'))
