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
python -m scripts.reset_demo                  # Maya, 52, Birmingham, type 2 diabetes, Metformin + weekly Semaglutide + Paracetamol
uvicorn app.main:app --port 8000              # set GEMINI_API_KEY and GEMINI_MODEL in backend/.env
cd ../frontend && npm run dev                 # http://localhost:3000 -> "Try the demo account"
```
- Use `GEMINI_MODEL=gemini-3.5-flash-lite`: in testing it answered in about 5 s, while `gemini-3.1-flash-lite` swung from 3 to 30+ s.
- Before recording, open trial NCT06897475 (Birmingham) once so its explanation is cached, then `reset_demo` for a clean start.
- Demo story and narration: [`docs/demo-script.md`](docs/demo-script.md). Scan `demo-assets/insulin-box-with-pharmacy-label.jpg` (synthetic pharmacy label) when Maya's GP prescribes insulin.
- If port 8000 is taken, run the backend on another port and start the frontend with `NEXT_PUBLIC_API_URL=http://localhost:<port>`.

## The phone app (iOS / Android)
PhaseZero ships as a Capacitor app (`frontend/ios`, `frontend/android`) that opens the running PhaseZero frontend, so every screen and sign-in work exactly as on the web.
```bash
# with the backend and frontend running (see above)
cd frontend && npx cap sync ios && npx cap open ios     # Xcode: pick an iPhone simulator, press Run
```
- In the app, the landing page forwards to sign-in; use **Try the demo account**.
- Simulator: `localhost` is your Mac, nothing else to set. Add the demo label photo to the simulator with `xcrun simctl addmedia booted demo-assets/insulin-box-with-pharmacy-label.jpg`, then use **Upload from gallery**.
- Real phone on the same Wi-Fi: `CAP_SERVER_URL=http://<your Mac's IP>:3000 npx cap sync ios`, set `FRONTEND_ORIGIN=http://<IP>:3000` in `backend/.env`, start the backend with `--host 0.0.0.0` and the frontend with `NEXT_PUBLIC_API_URL=http://<IP>:8000`.
- A fully bundled build (no server) is opt-in with `npm run build:static`; dynamic trial pages need more work before that's usable.

## Presage check-in (real measurement)
The phone app and simulator can't run Presage, so measurements come from a small desktop app that uses Presage's official SDK on your Mac's webcam and saves the result to Maya's account.
```bash
cd integrations/presage-desktop
npm install                       # first time only
# .env needs PRESAGE_API_KEY, PRESAGE_RESULT_SECRET (32+ random characters) and
# CAREFLOW_BACKEND_URL=http://127.0.0.1:8000 (or 8010 if that's where the backend runs)
npm start
```
Click **Connect**, tick camera consent, **Start camera measurement**, sit still for 30–60 s, then tick save consent and **Save**. The reading appears in Maya's diary, and the trial agent receives it as a low-trust check-in.

## Integration status (keep honest!)
| Integration | Status | Notes |
|---|---|---|
| Gemini (prescription + trial explanation) | Live, verified end to end | label reading (1-3 photos), trial explanation and pre-screen; `GEMINI_MODEL=gemini-3.5-flash-lite` |
| Adaptive agent (incident.io track) | Live, verified end to end | re-checks opened trials when medications, profile, corrections or check-ins change; `/api/agent/*` |
| ClinicalTrials.gov v2 | Live, verified end to end | search, matches and trial details; optional cache: `python -m scripts.sync_trials asthma` |
| Presage SmartSpectra | Desktop companion (real SDK) | Mac webcam measurement via `integrations/presage-desktop` (Presage Node SDK 3.4.0) saves to the demo account; not inside the phone app yet |
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
