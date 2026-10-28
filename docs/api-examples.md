# API examples (curl)

```bash
API=http://localhost:8000/api        # or http://localhost:5173/api through the Vite proxy
TOKEN=$(curl -s -X POST $API/auth/login -H 'content-type: application/json' \
  -d '{"email":"demo@projectforge.ai","password":"Demo@12345"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).access_token")
AUTH="Authorization: Bearer $TOKEN"
PID=$(curl -s $API/projects -H "$AUTH" | node -pe "JSON.parse(require('fs').readFileSync(0)).projects[0].id")

# Original endpoints (unchanged)
curl -s -X POST $API/projects/recommend -H "$AUTH" -H 'content-type: application/json' -d '{"domain":"Healthcare","difficulty":"advanced","budget_usd":2000,"budget_currency":"INR"}'
curl -s -X POST $API/projects/analyze   -H "$AUTH" -H 'content-type: application/json' -d '{"idea_text":"AI-based bone fracture detection using Vision Transformer"}'
curl -s -X POST $API/projects/improve   -H "$AUTH" -H 'content-type: application/json' -d "{\"project_id\":\"$PID\"}"
curl -s -X POST $API/projects/roadmap   -H "$AUTH" -H 'content-type: application/json' -d "{\"project_id\":\"$PID\"}"   # now also returns weekly_plan
curl -s -X POST $API/projects/compare   -H "$AUTH" -H 'content-type: application/json' -d '{"project_ids":["<ID1>","<ID2>"]}'  # now also returns recommended

# 2.0: GitHub intelligence (works without GITHUB_TOKEN)
curl -s "$API/github/related?projectId=$PID&limit=8"            -H "$AUTH"      # add &refresh=true to bypass the cache
curl -s "$API/github/analyze?projectId=$PID"                    -H "$AUTH"
# 2.0: research intelligence
curl -s "$API/research/related?projectId=$PID"                  -H "$AUTH"
# 2.0: analysis
curl -s -X POST $API/projects/novelty       -H "$AUTH" -H 'content-type: application/json' -d "{\"project_id\":\"$PID\"}"
curl -s -X POST $API/projects/reality-check -H "$AUTH" -H 'content-type: application/json' -d "{\"project_id\":\"$PID\"}"
curl -s -X POST $API/projects/differentiate -H "$AUTH" -H 'content-type: application/json' -d "{\"project_id\":\"$PID\"}"
curl -s -X POST $API/projects/feasibility   -H "$AUTH" -H 'content-type: application/json' -d "{\"project_id\":\"$PID\"}"
curl -s -X POST $API/projects/blueprint     -H "$AUTH" -H 'content-type: application/json' -d "{\"project_id\":\"$PID\"}"
curl -s $API/projects/$PID/analysis -H "$AUTH"                                  # everything stored for the project
curl -s -X PATCH $API/projects/$PID/progress -H "$AUTH" -H 'content-type: application/json' -d '{"status":"building"}'
```
