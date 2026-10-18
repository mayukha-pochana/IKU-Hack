# CareFlow AI
**From Trial Discovery to Treatment Adherence, Without the Friction.**

One patient profile connecting clinical trial discovery, medication adherence and optional contactless biometric check-ins.

> Hackathon prototype (IKU Womxn in STEM). Not a regulated medical product. All demo data is synthetic.

## Quick start
```bash
# Database (Postgres/TimescaleDB) + backend + frontend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up --build
```
Or run separately:
```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000   # docs at /docs

# frontend
cd frontend && npm install && npm run dev   # http://localhost:3000
```

## Running the demo (real backend, verified end to end)
```bash
docker compose up -d db                       # Postgres/TimescaleDB on :5432
cd backend && alembic upgrade head            # creates all tables
python -m scripts.reset_demo                  # Maya, 52, type 2 diabetes, London, taking Metformin
uvicorn app.main:app --port 8000              # set GEMINI_API_KEY and GEMINI_MODEL in backend/.env
cd ../frontend && npm run dev                 # http://localhost:3000 -> "Try the demo account"
```
- Use `GEMINI_MODEL=gemini-3.5-flash-lite`: in testing it answered in about 5 s, while `gemini-3.1-flash-lite` swung from 3 to 30+ s.
- Before recording, open trial NCT07760883 once so its explanation is cached, then run `reset_demo` only if you need a clean start.
- Demo story: open NCT07760883 ("We need to check") → add Insulin glargine on My medications → dashboard "1 trial changed" ("Not a fit right now") → trial page "Not right? Fix it" → "I stopped taking Insulin glargine" → back to "We need to check".
- If port 8000 is taken, run the backend on another port and start the frontend with `NEXT_PUBLIC_API_URL=http://localhost:<port>`.

## Integration status (keep honest!)
| Integration | Status | Notes |
|---|---|---|
| Gemini (prescription + trial explanation) | Live, verified end to end | label reading (1-3 photos), trial explanation and pre-screen; `GEMINI_MODEL=gemini-3.5-flash-lite` |
| Adaptive agent (incident.io track) | Live, verified end to end | re-checks opened trials when medications, profile, corrections or check-ins change; `/api/agent/*` |
| ClinicalTrials.gov v2 | Live, verified end to end | search, matches and trial details; optional cache: `python -m scripts.sync_trials asthma` |
| Presage SmartSpectra | Partial | check-ins with heart and breathing rate are saved and used by the agent as low-trust evidence; see `backend/app/services/presage/README.md` |
| PostgreSQL / TimescaleDB | Live, verified end to end | local `docker compose up -d db`; Tiger Data cloud works by setting `DATABASE_URL` (not used in testing) |
| ElevenLabs | Not used | backend code remains; Read aloud removed from the UI |
| Snowflake Cortex Search | Not used | trial accounts can't use Cortex; code switches on only if `SNOWFLAKE_*` is set |
| Vultr | OPTIONAL | |

## Snowflake trial search
Snowflake holds only public ClinicalTrials.gov data; patient data never leaves Postgres. Only de-identified
search text (conditions, age band, medication names, location) is sent at query time.

1. In a Snowsight worksheet, run sections 1-2 of [`docs/snowflake-setup.sql`](docs/snowflake-setup.sql).
2. Create a programmatic access token, then set `SNOWFLAKE_ACCOUNT_URL` and `SNOWFLAKE_PAT` in `backend/.env`.
3. Load trials (SQL API, from `backend/`): `python -m scripts.sync_trials_snowflake asthma "type 2 diabetes"`
4. Run sections 3-4 of the SQL file: pick an `AI_COMPLETE` model available in your region, then create the
   Cortex Search service.
5. `GET /api/trials/matches` now returns `X-Trials-Source: snowflake_cortex`. If Snowflake is unset or fails,
   it falls back to the Postgres cache / live ClinicalTrials.gov.

## Docs
`docs/architecture.md`, `docs/api-contracts.md`, `docs/team-ownership.md`, `docs/demo-script.md`, `docs/devpost-draft.md`

## Disclaimer
CareFlow AI does not provide medical advice, diagnosis, or definitive trial eligibility decisions.
