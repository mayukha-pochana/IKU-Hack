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
| Gemini (prescription + trial simplification) | TODO | set `GEMINI_API_KEY`, verify `GEMINI_MODEL` |
| ClinicalTrials.gov v2 | TODO | no key needed; optional cache: `python -m scripts.sync_trials asthma` |
| Presage SmartSpectra | TODO | see `backend/app/services/presage/README.md` |
| ElevenLabs | TODO | set `ELEVENLABS_API_KEY` |
| Tiger Data | TODO | set `DATABASE_URL` |
| Vultr | OPTIONAL | |

## Docs
`docs/architecture.md`, `docs/api-contracts.md`, `docs/team-ownership.md`, `docs/demo-script.md`, `docs/devpost-draft.md`

## Disclaimer
CareFlow AI does not provide medical advice, diagnosis, or definitive trial eligibility decisions.
