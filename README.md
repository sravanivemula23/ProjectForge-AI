# ProjectForge AI 2.0

An AI-powered **Project Discovery, Novelty Analysis, Research Intelligence and Project Planning** platform for students and developers. It answers: *What should I build? Does it already exist? Which GitHub projects and papers are similar? What is the research gap? How original is it, how hard is it, and what should I build first?*

**Stack:** React + Vite + Tailwind · Node.js + Express · MongoDB + Mongoose (Atlas Vector Search) · JWT + bcrypt · Anthropic/OpenAI-compatible LLMs (optional) · GitHub REST API · Semantic Scholar, OpenAlex, arXiv, Crossref · Docker

> **No fabricated data.** Repositories, stars, links, papers, authors, DOIs, datasets and statistics only ever come from the GitHub/research APIs. When something cannot be obtained the UI says **"Information unavailable."** AI/template suggestions are labelled separately from verified external data. Novelty scores are *estimates* from the sources that could be retrieved, never proof of uniqueness.

## Run it
```bash
unzip projectforge-ai-advanced.zip && cd projectforge-ai-advanced
cp .env.example .env            # optional: add GITHUB_TOKEN / AI_API_KEY (everything works without them)
docker compose up --build
```
Frontend **http://localhost:5173** · API **http://localhost:8000** (`/api/health`) · MongoDB **27017**.
Demo login `demo@projectforge.ai / Demo@12345`, admin `admin@projectforge.ai / Admin@12345` (seed data; change before real use). Needs Docker Compose v2.24+.

Without Docker: `npm run setup` then `npm run dev` (API + web with a throw-away in-memory MongoDB). With your own MongoDB/Atlas set `MONGODB_URI` in `.env`, then `npm --prefix backend run dev` and `npm --prefix frontend run dev`.
Tests: `npm test` (backend + frontend). Backend integration tests use an in-memory MongoDB, or yours via `TEST_MONGODB_URI=mongodb://127.0.0.1:27017/pf_test`. **No test calls a real external service.**

## What's new in 2.0
| Feature | Where |
|---|---|
| **GitHub intelligence** - multi-strategy search, deterministic relevance score, de-duplication, MongoDB TTL cache, graceful failure | Project → *GitHub* tab · `GET /api/github/related`, `/analyze` |
| **Research paper intelligence** - real papers, DOI/links, extracted methodology/dataset/result/limitations/future work, **research gap analysis** | Project → *Research* tab · `GET /api/research/related` |
| **Project novelty score** - GitHub / feature / research / technology / market components with explanations | Project → *Reality check* · `POST /api/projects/novelty` |
| **Project reality check** - 🟢/🟡/🔴 status, similar-repo counts, closest match, common vs less-explored features | `POST /api/projects/reality-check` |
| **Make this project more unique** - relevance-gated suggestions with why / difficulty / originality gain, plus "Generate improved version" | `POST /api/projects/differentiate`, existing `/improve` |
| **ProjectForge Score** - transparent weighted final score | Overview tab |
| **Feasibility analysis**, **22-section blueprint**, **adaptive week-by-week roadmap** | Blueprint & Roadmap tabs · `/feasibility`, `/blueprint`, `/roadmap` |
| **Personalization** - academic requirement, research interests, INR/USD budget; used by recommendations and scoring | Profile & Generate pages |
| **Dashboard & library** - intelligence summaries, progress status (idea → done), save/compare | Dashboard, `PATCH /api/projects/:id/progress` |
| Compare now adds GitHub similarity, industry, portfolio value, cost level and a **Recommended project** with reasons | Compare page |

Everything from 1.x still works unchanged (auth, roles, recommendations, embedding novelty analysis, comparison, roadmap, architecture, documentation, export, admin).

## Architecture
```
React 18 + Vite ──/api (Vite proxy)──> Express 4 ──Mongoose──> MongoDB (Atlas Local / Atlas)
                                          routes -> controllers -> services -> models
backend/src/services/
  github/        queries.js (5 strategies) · client.js (token optional, rate-limit cooldown, safe URLs) · relevance.js · index.js (cache, de-dup, status)
  research/      index.js (providers, cache) · extract.js (extractive, never generative) · gap.js
  intelligence/  novelty · reality · differentiation · aspects · feasibility · quality · blueprint · weeklyPlan · text/corpus helpers
  ai/ embeddings/ recommendation/ novelty/ scoring/ roadmap/ documentation/ search/ export/   (1.x)
```
New collections: `GitHubRepositoryCache`, `ResearchPaperCache` (per-query caches with `expires_at` TTL indexes) and `ProjectIntelligence` (one document per project). Existing models only gained optional fields (`Project.progress`, profile `academic_requirement`/`research_interest`, preference `budget_currency`/`budget_amount`).

## GitHub integration
* **Queries:** title, keywords, alternative terminology (synonyms), technology, features, description - up to 5 distinct sanitised queries, never one.
* **Data per repository:** name, full name, owner, description, URL, stars, forks, watchers, language, topics, created/updated/pushed dates, open issues, license, archived, default branch, activity level, relevance score.
* **Relevance (deterministic):** `textScore` = weighted mean of title 25%, description 15%, keyword 10%, technology 12%, domain 6%, feature 10%, topics 7%; `relevance = 100 × textScore × (0.85 + 0.15 × popularity)` where popularity blends activity, stars and recency. Popularity can nudge a score but never rescue an unrelated repository (a 500k-star "awesome list" stays near 0).
* **Duplicates:** the same repository found by several queries (case-insensitive) is returned once; top 8 are shown, "Show more" reveals up to 20.
* **Cache & limits:** per-query MongoDB cache (`GITHUB_CACHE_TTL_HOURS`), in-flight request de-duplication, a cooldown after a GitHub rate-limit response, and a per-user limiter (`GITHUB_RATE_LIMIT_PER_MINUTE`).
* **Failure handling:** rate limits, network errors, bad responses, downtime, empty results and a missing token never produce a 500. The API returns `status` (`ok | partial | empty | rate_limited | unavailable`) and the UI shows *"GitHub projects could not be loaded right now."* with **Try Again**; the rest of the page keeps working.
* **Safety:** only `https://github.com/<owner>/<repo>` links are ever returned; users cannot supply URLs (only a project id), so there is no SSRF surface. The token never leaves the backend.

## Research intelligence & gap analysis
Papers come from Semantic Scholar, OpenAlex, arXiv and Crossref (cached, per-user rate limited). Each paper shows title, authors, year, venue, DOI/link, relevance, and **sentences extracted verbatim from its real abstract** for methodology, dataset, main result, limitations and future work; fields the abstract does not contain show *Information unavailable*. The gap analysis scans only the retrieved abstracts for 14 relevance-gated aspects (multilingual, explainable AI, real-time, edge/offline, privacy/federated, personalization, …) and reports what existing research mentions, what it does not (potential gaps), and a suggested contribution. "Not mentioned in these abstracts" is not proof that no research exists, and the UI says so.

## Novelty engine, reality check and scoring
* **Novelty (0-95, capped):** overall = weighted mean of the *available* components - GitHub uniqueness 30%, feature uniqueness 25%, research uniqueness 20%, technology novelty 15%, market differentiation 10%. Components pull toward 50 when evidence is thin; a source that could not be queried yields `null` ("Information unavailable"), not a guess. Formulas: `services/intelligence/novelty.js`.
* **Reality check:** 🔴 closest match ≥ 75% and still maintained (or a very similar paper) · 🟡 closest ≥ 45% or 3+ similar repositories · 🟢 otherwise · ⚪ unknown if no source was reachable. "Similar" means ≥ 50% similarity *among retrieved results*, reported as "N of M retrieved".
* **Differentiation:** suggestions are filtered by project relevance (e.g. federated learning only for sensitive-data ML projects) and skipped if the project already has them. *Expected originality improvement* = base points × evidence factor (absent from all sources 100%, common 40%, thin evidence 50%) with the basis printed. With `AI_API_KEY` the LLM proposes project-specific ideas (zod-validated); otherwise labelled template suggestions are used.
* **ProjectForge Score:** 25% novelty + 15% technical depth + 20% industry relevance + 15% research potential + 15% feasibility + 10% portfolio value (sub-formulas in `services/intelligence/quality.js`). Novelty counts as an *unverified prior* until the analysis runs.
* **Feasibility, blueprint, roadmap:** deterministic from the project, your profile/preferences and retrieved evidence; the blueprint/differentiation can be LLM-written and are zod-validated with template fallback. Datasets are never invented: only dataset sentences from retrieved abstracts are shown, otherwise "Information unavailable".

## API
All endpoints require `Authorization: Bearer <JWT>` unless noted. Errors are `{ "detail": "..." }` (422 validation, 401/403 auth, 404 not found/not yours, 429 rate limit).

| Method & path | Purpose |
|---|---|
| `POST /api/auth/register · login · forgot-password · reset-password` | Auth (public) |
| `GET /api/health` | Status incl. LLM/embedding/vector search (public) |
| `GET/PUT /api/users/me`, `PUT /api/users/me/profile` | Profile (now incl. `academic_requirement`, `research_interest`) |
| `POST /api/projects/recommend`, `GET /recommendations` | Personalised ideas (`budget_currency`: USD/INR) |
| `POST /api/projects/analyze · improve · compare · roadmap · architecture · documentation` | 1.x features; `roadmap` adds `weekly_plan`, `compare` adds `recommended` |
| `GET /api/github/related?projectId&limit&refresh` | Ranked related repositories (+ `status`, `message`, `retryable`, `summary`) |
| `GET /api/github/analyze?projectId` | Activity, licenses, languages, closest match |
| `GET /api/research/related?projectId` | Papers + research gap analysis |
| `POST /api/projects/novelty` `{project_id, refresh?}` | Novelty breakdown + ProjectForge Score + feasibility + reality check |
| `POST /api/projects/reality-check · differentiate · feasibility · blueprint` | Individual analyses (stored in `ProjectIntelligence`) |
| `GET /api/projects/:id/analysis` | Everything stored for a project |
| `PATCH /api/projects/:id/progress` | `idea · researching · planning · building · testing · done` |
| `GET /api/projects · /:id`, `DELETE`, `POST/DELETE /:id/save`, `POST /:id/favorite`, `GET /:id/export` | Library |
| `GET /api/dashboard`, `/api/admin/*` | Dashboard (+ `intelligence`, `progress_counts`), admin |

Examples: `docs/api-examples.md`.

## Environment variables
See `.env.example` (all optional except `JWT_SECRET` in production): `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `AI_PROVIDER/AI_API_KEY/AI_MODEL/AI_BASE_URL`, `GITHUB_TOKEN`, `GITHUB_CACHE_TTL_HOURS`, `RESEARCH_CACHE_TTL_HOURS`, `GITHUB_RATE_LIMIT_PER_MINUTE`, `RESEARCH_RATE_LIMIT_PER_MINUTE`, `AI_RATE_LIMIT_PER_MINUTE`, `SEMANTIC_SCHOLAR_API_KEY`, `OPENALEX_API_KEY`, `INR_PER_USD`, seed settings. Secrets live only in the backend environment.

## Docker
`docker compose up --build` starts `mongo` (MongoDB Atlas Local), `backend` (:8000) and `frontend` (:5173). Containers use service names (`mongodb://mongo:27017`, `http://backend:8000`); the browser only talks to the frontend, whose Vite dev server proxies `/api`.

## Security notes
JWT (HS256) + bcrypt, role-based access, zod validation of bodies **and query strings**, ObjectId validation, ownership checks on every project route, helmet, CORS allow-list, rate limiting (IP-based on auth, per-user on GitHub/research/AI endpoints), no user-supplied URLs fetched, only `github.com` repository links and `https` paper links returned, external responses validated before use, generic 500s with server-side logging. The JWT is stored in `localStorage` (use httpOnly cookies for stronger XSS resistance). Password-reset emails are not sent (token returned only when `NODE_ENV=development`).

## Troubleshooting
* *GitHub shows "could not be loaded"* → rate limit or outage; wait a few minutes, press **Try Again**, or set `GITHUB_TOKEN` for higher limits (unauthenticated search is ~10 requests/minute; each new analysis uses up to 5 queries, then the cache helps).
* *Research logs show TimeoutError / Rate limited* → set `OPENALEX_MAILTO` and `CROSSREF_MAILTO` to your email (faster polite pools), add a free `SEMANTIC_SCHOLAR_API_KEY` (anonymous access is heavily throttled), and raise `SEARCH_TIMEOUT_SECONDS` (default 20) on slow networks. Transient failures are retried once automatically; apply `.env` changes with `docker compose up -d`.
* *Research section unavailable* → providers rate-limit anonymous use; add `SEMANTIC_SCHOLAR_API_KEY` / `OPENALEX_API_KEY` or retry later. Results are cached for `RESEARCH_CACHE_TTL_HOURS`.
* *Novelty shows "Information unavailable" for a component* → that source failed; run the analysis again later.
* *Frontend cannot reach the API in Docker* → `API_PROXY_TARGET` must be `http://backend:8000`, never `localhost`.
* *`$vectorSearch` unavailable* → plain MongoDB; the in-process fallback is used automatically.

## Known limitations
GitHub relevance is keyword/text based (not semantic); the "similar repositories" count is among retrieved results, not all of GitHub; research extraction depends on abstracts being available; the INR rate is a fixed setting; password-reset email delivery is not implemented. See `docs/MIGRATION.md` for the 1.x → MERN notes.
