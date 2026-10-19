# Phase Zero
**Less administration, more participation**

Makes it easier to gain knowledge about and join clinical trials, and organise and store your medication, and track your doses.
One stop shop for all the little things you miss, plus demystifying clinical trials so that you are more likely to participate.

> Hackathon prototype (IKU Womxn in STEM)

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
python -m scripts.reset_demo                  
uvicorn app.main:app --port 8000              
cd ../frontend && npm run dev                 # http://localhost:3000 -> "Try the demo account"
```
## The phone app (iOS / Android)
Phase Zero ships as a Capacitor app (`frontend/ios`, `frontend/android`) that opens the running PhaseZero frontend, so every screen and sign-in work exactly as on the web.
```bash
# with the backend and frontend running (see above)
cd frontend && npx cap sync ios && npx cap open ios     # Xcode: pick an iPhone simulator, press Run
```
- In the app, the landing page forwards to sign-in; use **Try the demo account**.
- Simulator: `localhost` is your Mac, nothing else to set. Add the demo label photo to the simulator with `xcrun simctl addmedia booted demo-assets/insulin-box-with-pharmacy-label.jpg`, then use **Upload from gallery**.
- Real phone on the same Wi-Fi: `CAP_SERVER_URL=http://<your Mac's IP>:3000 npx cap sync ios`, set `FRONTEND_ORIGIN=http://<IP>:3000` in `backend/.env`, start the backend with `--host 0.0.0.0` and the frontend with `NEXT_PUBLIC_API_URL=http://<IP>:8000`.
- A fully bundled build (no server) is opt-in with `npm run build:static`; dynamic trial pages need more work before that's usable.

## Presage check-in (real measurement)
The phone app and simulator can't run Presage, so measurements come from a small desktop app that uses Presage's official SDK on your Mac's webcam and saves the result to Barbara's account.
```bash
cd integrations/presage-desktop
npm install                       # first time only
npm start
```
Click **Connect**, tick camera consent, **Start camera measurement**, sit still for 30–60 s, then tick save consent and **Save**. The reading appears in Barbara's diary, and the trial agent receives it as a low-trust check-in.
