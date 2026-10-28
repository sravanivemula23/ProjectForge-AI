# Migration notes: FastAPI + PostgreSQL -> Express + MongoDB

**Kept:** the whole React frontend (pages, components, styling, tests), every endpoint path, method, auth rule and `{detail}` error shape, scoring and novelty formulas, AI fallbacks, labelling of verified vs generated data.

## Frontend changes (small edits)
`services/api.js` (same-origin `/api` + Vite proxy) · `Compare.jsx` (ids are strings) · `Admin.jsx` (role `student` -> `user`) · `Landing.jsx` (stack chips) · `ProjectDetail.jsx` (new "Also seen in earlier analyses" card) · `vite.config.js` (proxy).

## PostgreSQL -> MongoDB
| SQL table | Mongoose model |
|---|---|
| users + profiles | `User` with embedded `profile` (strict 1:1) |
| project_preferences, projects, project_recommendations, project_scores | same names |
| project_analyses, similar_projects, research_papers | `ProjectAnalysis`, `SimilarProject`, `ResearchPaper` (embeddings stored with vector indexes) |
| saved_projects, favorites | `SavedProject`, `Favorite` (unique `(user_id, project_id)`) |
| roadmaps, documents | `Roadmap`, `Document` (`doc_type`: documentation / architecture) |
| usage_logs, password_reset_tokens | `UsageLog` (90-day TTL), `PasswordResetToken` (TTL on `expires_at`) |

Field names stay snake_case so JSON responses are unchanged; `_id` is exposed as `id`. `ON DELETE CASCADE/SET NULL` is implemented explicitly in `projectController.remove` and covered by a test.

## FastAPI -> Express
`api/*.py` -> `routes/` + `controllers/` · pydantic -> zod · SQLAlchemy -> Mongoose · PyJWT/bcrypt -> jsonwebtoken/bcryptjs · slowapi-style limiter -> express-rate-limit · security headers -> helmet.

## Python AI -> Node AI
`ai/*.py` -> `services/{ai,recommendation,novelty,roadmap,documentation}` · `services/search.py` -> `services/search/*` (`Promise.allSettled`) · `embeddings.py` -> `services/embeddings/*`. The Node scoring, novelty and hashing-embedding code reproduces the Python results exactly (21 golden-fixture tests).

## pgvector -> MongoDB Vector Search
See the README section "Vector search". Per-analysis similarity is unchanged; `$vectorSearch` powers the new corpus lookup, with an automatic fallback.
