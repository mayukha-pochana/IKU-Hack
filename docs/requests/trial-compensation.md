# Request: send trial payment details

**From:** Frontend (Member 2) · **Owner:** whoever owns `backend/app/services/trials/` and `schemas/trials.py`

Some trials pay participants or cover travel, which can be a real incentive to take part. The app now shows a
"Pays participants" tag on trial cards, a "Payment for taking part" fact on the trial page, and a **Paid** filter.

ClinicalTrials.gov has no structured payment field, so payment is only ever in the trial's own wording (usually
the description or eligibility sections). Until the API sends it, the frontend looks for phrases like
"compensation", "reimbursed", "stipend" or a £ amount in `brief_summary` and `inclusion_criteria`.

## Ask
- Add `compensation: str | None = None` to `Trial` in `schemas/trials.py`.
- Fill it with the sentence from the trial record that mentions payment or covered costs (check `detailedDescription`
  too, which the frontend doesn't receive). Leave it `None` when the trial doesn't say.
- Copy the trial's words as written. Never estimate or invent an amount.

Frontend contract: `frontend/src/types/index.ts` (`Trial.compensation`) and `frontend/src/lib/payment.ts`.
