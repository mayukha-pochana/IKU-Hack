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

## Integration status (keep honest!)
| Integration | Status | Notes |
|---|---|---|
| Gemini (prescription + trial explanation) | Implemented, live-tested | set `GEMINI_API_KEY`, verify `GEMINI_MODEL`; `POST /api/trials/{nct_id}/explain` |
| ClinicalTrials.gov v2 | TODO | no key needed; optional cache: `python -m scripts.sync_trials asthma` |
| Presage SmartSpectra | TODO | see `backend/app/services/presage/README.md` |
| ElevenLabs | Implemented, mock-tested | set `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`; `POST /api/voice/explain` |
| Snowflake Cortex Search | Implemented, mock-tested | see [Snowflake](#snowflake-trial-search); unset = existing cache/live search |
| Tiger Data | TODO | set `DATABASE_URL` |
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
