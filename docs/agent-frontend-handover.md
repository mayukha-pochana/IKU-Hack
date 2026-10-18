# Trial updates: frontend handover

CareFlow keeps the trials a patient has opened up to date. When something changes (a medication is confirmed, the profile is edited, a correction is made, a check-in reading matters, or the registry changes), it re-checks those trials and explains the change in plain words. Backend: `feature/adaptive-agent`. It is the incident.io "adaptable agents" entry.

**Never say "agent", "event" or "conflict" in the UI.** Talk about the patient's trials changing.

## Words to use

| `status` (API)              | Show            | Badge tone |
|-----------------------------|-----------------|------------|
| `POTENTIAL_MATCH`           | Could be a fit  | success    |
| `MORE_INFORMATION_NEEDED`   | We need to check| warning    |
| `KNOWN_CRITERIA_MISMATCH`   | Not a fit right now | danger |

The backend already sends these words as `label` / `previous_label`. Use them rather than mapping yourself.

## The `update` object

It appears on a trial once the patient has opened that trial's explanation:

```json
{
  "status": "KNOWN_CRITERIA_MISMATCH",
  "label": "Not a fit right now",
  "previous_status": "MORE_INFORMATION_NEEDED",
  "previous_label": "We need to check",
  "reason": "\"You are taking insulin to manage your diabetes\" now means this study may not fit you (from Insulin glargine).",
  "changed_at": "2026-10-18T09:12:00Z",
  "is_new": true,
  "provisional": false,
  "fix_options": [
    {"label": "I stopped taking Insulin glargine",
     "facts": [{"type": "medication_stopped", "value": "Insulin glargine"}]}
  ]
}
```

- `is_new`: the status changed since the patient last looked. Show an "Updated today" chip.
- `provisional`: Gemini was busy. The status and reason already reflect what the patient told us; show a small "We'll double-check this shortly" line. It re-checks itself on the next change.
- `fix_options`: one button each. Send the option object unchanged (see "Not right? Fix it"). There are 0 to 3 options; an undo appears automatically after a fix.

## Screens

### 1. Dashboard notice
`GET /api/agent/updates` returns:
```json
{ "new_count": 1, "updates": [ { "nct_id": "NCT07760883", "title": "...", "...": "the update fields above" } ], "handled_events": [] }
```
- If `new_count > 0`, show a card: bell icon, "**1 trial changed**", the first update's title, and "{label}, {reason}". The button "See why" links to `/trials/{nct_id}`.
- If `new_count` is 0, show nothing.

### 2. Trial list (`/trials`) and trial details (`/trials/[nctId]`)
- `GET /api/trials/matches`: each match now has an optional `update`, and its `status` already reflects it. The list comes back sorted best fit first, so don't re-sort.
- `POST /api/trials/{nct_id}/explain`: the response now includes `update`, `conflicts`, and, per criterion, `evidence_source` and `note`.
- On the card, when `update` is present:
  - the badge uses `update.label`
  - if `is_new`: an "Updated today" chip, then `update.reason`
  - if `previous_label`: a small line "Was {previous_label}"
  - a "Not right? Fix it" link that expands `fix_options` into buttons, plus a "That's correct" button
- When the patient opens a changed trial: `POST /api/agent/updates/seen` with `{"nct_ids": ["NCT…"]}`. This returns 204 and clears the dashboard notice.

### 3. "Not right? Fix it"
- One tap: `POST /api/agent/corrections` with the option object, e.g. `{"label": "I stopped taking Insulin glargine", "facts": [...]}`.
- Free text (optional "Something else?" field): `POST /api/agent/corrections` with `{"text": "I stopped insulin last year"}`.
- The response contains the updated conclusions. Then refetch the trial (or `GET /api/agent/updates`) and show the new badge and reason.
- After a medication fix, show a link: "Update your medication list", so the records stop disagreeing.
- "That's correct": call `/api/agent/updates/seen` for that trial and collapse the options.

### 4. Check-in confirmation
After `POST /api/health-checkins` succeeds, call `GET /api/agent/updates`:
- If `new_count > 0`: "This changed 1 of your trials", linking to it.
- Otherwise: "Your trial matches didn't change."

### 5. Explanation criteria: two small fixes
- Replace "From your profile:" with a label based on `evidence_source`:
  - `profile`: "From your profile"
  - `medication`: "From your medication list"
  - `patient_correction`: "From what you told us"
  - `sensor_reading`: "From your check-in (camera estimate)"
  - `patient_note`: "From your note"
- If `note` is present, show it under the criterion (e.g. "Based only on a contactless sensor estimate; confirm with the study team.").

## Remove
- The "Read aloud" button (ElevenLabs is no longer used).

## Demo trial
NCT07760883 (Metformin Effects According to SLC16A11 Carrier Status).

Demo patient: Maya, 52, type 2 diabetes, London, taking Metformin.

1. Open the trial: **We need to check**.
2. Add Insulin glargine on the medications page. The dashboard says **1 trial changed**, and the card shows **Not a fit right now**, with the insulin reason.
3. Tap "Not right? Fix it" → "I stopped taking Insulin glargine". The card goes back to **We need to check**.

Leave a few seconds between steps: Gemini's free tier rate-limits quick bursts. If a card shows "We'll double-check this shortly", that's the busy fallback, and the next action catches up.
