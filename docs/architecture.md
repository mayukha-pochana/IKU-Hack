# Architecture

```
Next.js (frontend) --HTTP/cookies--> FastAPI (backend) --> Postgres / TimescaleDB (Tiger Data)
                                          |--> Gemini API (prescription vision, trial simplification)
                                          |--> ClinicalTrials.gov API v2
                                          |--> ElevenLabs TTS
                                          |--> Presage (see services/presage/README.md)
```

## Data flow
1. Auth: magic link (or flagged demo mode) -> signed HTTP-only session cookie.
2. Prescription image -> `/api/prescriptions/parse` -> Gemini -> validated JSON (NOT saved).
3. Patient confirms -> `POST /api/medications` -> medication + generated `dose_events`.
4. Patient reports dose status -> `PATCH /api/doses/{id}/status` -> adherence summary.
5. Profile + conditions -> ClinicalTrials.gov -> deterministic matching -> Gemini simplification of criteria.
6. Check-in: Presage measurement -> `POST /api/health-checkins` (no video stored).

## Safety boundaries
- LLM never decides eligibility; statuses are deterministic.
- Dose status is patient-reported only.
- Biometrics are never used to infer adherence or diagnose.

## Presage limitation
TODO: document the actual runtime chosen once SDK platform support is verified.

## Trials cache (optional, M3)
`trials_cache` holds a snapshot of real recruiting studies pulled via the v2 API (`python -m scripts.sync_trials asthma`).
`/api/trials/search` tries live first; if ClinicalTrials.gov is unreachable it serves the cache and sets
`X-Trials-Source: cache` so the UI can label results as cached. Reference: "Creating a Detailed Dataset of Trials from
Clinicaltrials.gov using Python" (TL;DW Tutorials, Jan 2024) - its bulk-dataset idea informed this; its code targets the
pre-v2 API so we use v2 pagination (`nextPageToken`) instead.
