# Team Ownership
| Member | Branch | Owns |
|---|---|---|
| 1 Frontend A | feature/frontend-landing | `app/page.tsx`, `app/login`, `app/onboarding`, `components/landing`, `components/onboarding` |
| 2 Frontend B | feature/frontend-dashboard | `app/dashboard`, `app/medications`, `app/trials`, `app/check-in`, `app/profile`, `components/{dashboard,medications,trials,biometrics}` |
| 3 Backend A | feature/backend-core-trials | `core/`, `db/`, `auth/`, `alembic/`, `models/{user,patient,trial_bookmark}.py`, `routers/{auth,profile,trials}.py`, `services/trials/`, `scripts/sync_trials.py`, `models/trial_cache.py` |
| 4 Backend B | feature/backend-medications | `models/{medication,dose_event,health_checkin}.py`, `routers/{prescriptions,medications,schedule,adherence,biometrics,voice}.py`, `services/{gemini,scheduling,presage,elevenlabs}/` |

## Shared files (single owner, request changes via PR comment)
- `frontend/src/lib/api.ts`, `frontend/src/types/` -> Member 2 (Member 1 may add auth/profile calls in separate sections)
- `frontend/src/components/ui/` (shadcn) -> Member 2
- `backend/app/main.py` router mounting, `models/__init__.py` -> Member 3
- Never commit directly to `main`; use PRs.
