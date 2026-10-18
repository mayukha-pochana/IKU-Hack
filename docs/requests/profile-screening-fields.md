# Request for Member 3: store profile screening fields

**From:** Frontend (Members 1 and 2) · **Owner:** Member 3 (`models/patient.py`, `schemas/profile.py`, migration)

The profile form now asks for a few things trials commonly screen on. The frontend already sends them in
`PUT /api/profile` and reads them from `GET /api/profile`, but `ProfileUpdate` currently ignores unknown fields,
so on the real backend they are dropped. Age keeps working: the frontend works it out from date of birth and sends `age`.

## Fields to add (all optional / nullable)

| Field | Type | Values | Why trials need it |
|---|---|---|---|
| `date_of_birth` | `DATE` | ISO `YYYY-MM-DD` | Exact age limits ("18 to 65") |
| `sex_at_birth` | `VARCHAR` | `female`, `male`, `intersex`, `prefer_not_to_say` | Studies recruiting one sex, sex-specific criteria |
| `smoking_status` | `VARCHAR` | `never`, `former`, `current` | Very common exclusion, especially lung studies |
| `pregnant_or_breastfeeding` | `VARCHAR` | `yes`, `no`, `not_sure` | Very common exclusion for medicine trials |
| `max_travel_miles` | `INTEGER` | `10`, `25`, `50`, `100`, `0` = any | Ranking/filtering by site distance |
| `last_name` | `VARCHAR` | free text | Full name on the profile (`display_name` is the first name) |
| `phone` | `VARCHAR` | free text, 10 to 15 digits | Contact details on the profile, ready if the person contacts a trial team |

## Suggested changes
- `schemas/profile.py`: add these fields to `ProfileUpdate` with `Literal[...]` types and `None` defaults; keep `age`.
  Optionally derive `age` from `date_of_birth` server-side when both are present.
- `models/patient.py` + one Alembic migration adding the nullable columns.
- Matching (`services/trials/`): treat these as *known information*. A study excluding smokers with `smoking_status = current`
  becomes `KNOWN_CRITERIA_MISMATCH`; unknown values go to `missing_information`. Never a definitive eligibility claim.

Frontend contract: `frontend/src/types/index.ts` (`Profile`) and `frontend/src/components/onboarding/profileDraft.ts` (`toPayload`).
