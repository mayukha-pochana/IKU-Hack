# API Contracts
OpenAPI is the source of truth: `http://localhost:8000/docs`. Error shape for all endpoints:
```json
{ "error": { "code": "string", "message": "string", "details": {} } }
```

| Owner | Method | Path |
|---|---|---|
| M3 | POST | /api/auth/request-link |
| M3 | GET | /api/auth/verify?token= |
| M3 | POST | /api/auth/demo-login (only if DEMO_AUTH_ENABLED) |
| M3 | GET | /api/auth/session |
| M3 | POST | /api/auth/logout |
| M3 | GET/PUT | /api/profile |
| M3 | GET | /api/trials/search |
| M3 | GET | /api/trials/matches |
| M3 | GET | /api/trials/{nct_id} |
| M3 | GET/POST | /api/trials/bookmarks |
| M4 | POST | /api/prescriptions/parse |
| M4 | POST/GET | /api/medications |
| M4 | GET | /api/medications/{id} |
| M4 | GET | /api/schedule/today |
| M4 | GET | /api/schedule/week |
| M4 | PATCH | /api/doses/{id}/status |
| M4 | POST/GET | /api/health-checkins |
| M4 | GET | /api/adherence/summary |
| M4 | GET | /api/adherence/history |
| M4 | POST | /api/voice/explain |

## Enums
- Dose status: `SCHEDULED | TAKEN | MISSED | SKIPPED`
- Trial match status: `POTENTIAL_MATCH | MORE_INFORMATION_NEEDED | KNOWN_CRITERIA_MISMATCH`
