// OWNER: Member 2 - "trial updates": CareFlow re-checks trials the patient has opened when something about them
// changes, and says what changed. Patient-facing words only: never "agent", "event" or "conflict".
// API and fields: docs/agent-frontend-handover.md.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Check, Clock, PencilLine } from "lucide-react";
import { updates } from "@/lib/api";
import type { FixOption, TrialUpdate, TrialUpdateItem } from "@/types";
import { Notice, Spinner, errorMessage } from "@/components/ui/pz";

const MEDICATION_FIX = /^medication_/;

/** "Updated today" chip, the one-sentence reason, and what it was before. */
export function UpdateDetails({ update: u }: { update: TrialUpdate }) {
  return (
    <div className="flex flex-col gap-1">
      {u.provisional ? (
        <p className="flex items-start gap-2 text-ink-muted"><Clock aria-hidden="true" size={18} className="mt-0.5 shrink-0" />We&apos;ll double-check this shortly.</p>
      ) : (
        <p className="text-body-lg">
          {u.is_new && <span className="pz-badge pz-badge--neutral mr-2 align-middle"><BellRing aria-hidden="true" strokeWidth={2.5} />Updated today</span>}
          {u.reason}
        </p>
      )}
      {u.previous_label && <p className="text-caption text-ink-muted">Was: {u.previous_label}</p>}
    </div>
  );
}

/** "Not right? Fix it": one-tap fixes from the backend, "That's correct", and an optional note in their own words. */
export function FixIt({ nctId, update: u, onUpdated }: { nctId: string; update: TrialUpdate; onUpdated: (next: TrialUpdate | null) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [textErr, setTextErr] = useState<string | null>(null);
  const [done, setDone] = useState<"fixed" | "confirmed" | null>(null);
  const [medicationFix, setMedicationFix] = useState(false);

  if (u.provisional) return null;

  async function apply(correction: FixOption | { text: string }, isMedication: boolean) {
    setBusy(true); setErr(null);
    try {
      await updates.correct(correction);
      const latest = (await updates.list()).updates.find((x) => x.nct_id === nctId) ?? null;
      setDone("fixed"); setMedicationFix(isMedication); setOpen(false); setText("");
      onUpdated(latest);
    } catch (e) { setErr(errorMessage(e, "Couldn't save that. Try again.")); } finally { setBusy(false); }
  }

  async function confirm() {
    setBusy(true); setErr(null);
    try { await updates.markSeen([nctId]); setDone("confirmed"); setOpen(false); onUpdated({ ...u, is_new: false }); }
    catch (e) { setErr(errorMessage(e, "Couldn't save that. Try again.")); } finally { setBusy(false); }
  }

  function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 2) { setTextErr("Tell us what's changed first."); return; }
    apply({ text: text.trim() }, /medic|tablet|inhaler|insulin|pill|dose/i.test(text));
  }

  return (
    <div className="flex flex-col gap-2">
      {done === "fixed" && (
        <Notice tone="success">
          <p>Thanks. We&apos;ve checked this trial again with what you told us.</p>
          {medicationFix && <Link href="/medications" className="pz-link">Update your medication list too</Link>}
        </Notice>
      )}
      {done === "confirmed" && <p className="text-caption text-ink-muted">Thanks for confirming.</p>}
      {!open ? (
        <button type="button" className="pz-link self-start text-left" aria-expanded={false} onClick={() => { setOpen(true); setDone(null); }}>Not right? Fix it</button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-line p-3" role="group" aria-label="Fix what this is based on">
          {u.fix_options.map((o) => (
            <button key={o.label} type="button" className="pz-btn pz-btn--secondary pz-btn--sm justify-start text-left" disabled={busy}
              onClick={() => apply(o, o.facts.some((f) => MEDICATION_FIX.test(f.type)))}>
              {busy ? <Spinner /> : <PencilLine aria-hidden="true" size={16} />}{o.label}
            </button>
          ))}
          <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm justify-start" disabled={busy} onClick={confirm}>
            <Check aria-hidden="true" size={16} />That&apos;s correct
          </button>
          <form onSubmit={sendText} className="flex flex-col gap-1">
            <label htmlFor={`fix-${nctId}`} className="text-caption text-ink-muted">Something else?</label>
            <div className="flex flex-wrap gap-2">
              <input id={`fix-${nctId}`} className="pz-field__input min-w-0 flex-1" placeholder="I stopped insulin last year" value={text}
                aria-invalid={textErr ? true : undefined} aria-describedby={textErr ? `fix-${nctId}-err` : undefined}
                onChange={(e) => { setText(e.target.value); setTextErr(null); }} />
              <button type="submit" className="pz-btn pz-btn--secondary pz-btn--sm" disabled={busy}>Send</button>
            </div>
            {textErr && <span id={`fix-${nctId}-err`} className="text-caption text-danger">{textErr}</span>}
          </form>
          <button type="button" className="pz-link self-start text-caption" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      )}
      {err && <Notice tone="danger">{err}</Notice>}
    </div>
  );
}

/** Dashboard notice: "1 trial changed". Renders nothing when there is no news. */
export function TrialsChangedNotice() {
  const [items, setItems] = useState<TrialUpdateItem[]>([]);
  useEffect(() => { updates.list().then((r) => setItems(r.updates.filter((u) => u.is_new))).catch(() => {}); }, []);
  if (!items.length) return null;
  const first = items[0];
  return (
    <section aria-labelledby="changed-h" className="pz-card border-violet">
      <h2 id="changed-h" className="flex items-center gap-2 pz-card__title">
        <BellRing aria-hidden="true" size={20} className="text-violet-text" />
        {items.length} {items.length === 1 ? "trial" : "trials"} changed
      </h2>
      <p className="pz-card__body"><span className="font-medium">{first.title}</span>: {first.label}. {first.reason}</p>
      <Link href={`/trials/${first.nct_id}`} className="pz-btn pz-btn--secondary pz-btn--sm self-start">See why <ArrowRight aria-hidden="true" size={16} /></Link>
    </section>
  );
}

/** One line after a check-in is saved. */
export function CheckinOutcome({ refreshKey }: { refreshKey: number }) {
  const [msg, setMsg] = useState<{ text: string; nct?: string } | null>(null);
  useEffect(() => {
    if (!refreshKey) return;
    updates.list().then((r) => {
      // Only count trials this check-in changed, not older updates.
      const changed = [...new Set((r.handled_events ?? []).flatMap((e) => e.changes.map((c) => c.nct_id)))];
      setMsg(changed.length
        ? { text: changed.length === 1 ? "This changed one of your trials." : `This changed ${changed.length} of your trials.`, nct: changed[0] }
        : { text: "Your trial matches didn't change." });
    }).catch(() => setMsg(null));
  }, [refreshKey]);
  if (!msg) return null;
  return (
    <Notice tone={msg.nct ? "warning" : "success"}>
      <p>{msg.text}</p>
      {msg.nct && <Link href={`/trials/${msg.nct}`} className="pz-link">See what changed</Link>}
    </Notice>
  );
}
