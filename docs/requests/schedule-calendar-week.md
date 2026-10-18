# Request for Member 4: return the calendar week from `GET /api/schedule/week`

**From:** Frontend (Member 2) · **Owner:** Member 4 (`routers/schedule.py`)

The blister pack and pill box now show the week **Monday to Sunday** so the two views line up. `/schedule/week`
currently returns today plus the next six days, so Monday to yesterday is missing and those cells show as empty.

**Change:** return doses from Monday 00:00 to the next Monday 00:00 of the current week, in the patient's timezone
(the `TODO(M4)` about timezone in `today()` applies here too). Response shape (`list[DoseOut]`) stays the same.
Frontend reference: `buildWeek()` in `frontend/src/components/medications/MedicationCalendar.tsx`.
