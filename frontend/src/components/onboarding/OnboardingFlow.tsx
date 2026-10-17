// OWNER: Member 1 - three-step health profile setup, saved to PUT /api/profile, then into the dashboard.
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ApiError, auth, profile } from "@/lib/api";
import { Loader, Notice, Spinner, Stepper, errorMessage } from "@/components/ui/pz";
import { AboutFields, ConditionFields, LocationFields } from "./ProfileFields";
import { EMPTY, fromProfile, toPayload, validateDob, validateName, type Draft } from "./profileDraft";

const STEPS = [
  { label: "about you", title: "First, a little about you" },
  { label: "your conditions", title: "What would you like trials for?" },
  { label: "where you are", title: "Where should we look?" },
];

export function OnboardingFlow() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [d, setD] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string | null>>>({});
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    auth.session()
      .then(() => profile.get().then((p) => setD(fromProfile(p))).catch(() => {}))
      .then(() => setReady(true))
      .catch((e) => { if (e instanceof ApiError && e.status === 401) router.replace("/login"); else { setErr(errorMessage(e)); setReady(true); } });
  }, [router]);

  useEffect(() => { if (ready) heading.current?.focus(); }, [step, ready]);

  function next(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (step === 1) {
      const v = { display_name: validateName(d), dob: validateDob(d) };
      setErrors(v);
      if (v.display_name || v.dob) return;
    }
    if (step < STEPS.length) { setStep(step + 1); return; }
    void save();
  }

  async function save() {
    setSaving(true);
    try { await profile.put(toPayload(d)); router.push("/dashboard"); }
    catch (e) { setErr(errorMessage(e, "We couldn't save your profile. Please try again.")); setSaving(false); }
  }

  if (!ready) return <Loader label="Getting your profile ready…" />;
  const s = STEPS[step - 1];
  return (
    <form onSubmit={next} className="flex flex-col gap-6">
      <Stepper step={step} total={STEPS.length} label={s.label} />
      <h1 ref={heading} tabIndex={-1} className="text-h1 outline-none">{s.title}</h1>
      {step === 1 && <AboutFields d={d} set={setD} errors={errors} />}
      {step === 2 && <ConditionFields d={d} set={setD} />}
      {step === 2 && d.conditions.length === 0 && <Notice>You can skip this, but we need at least one condition to look for trials.</Notice>}
      {step === 3 && <LocationFields d={d} set={setD} />}
      {err && <Notice tone="danger">{err}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="pz-btn pz-btn--primary" disabled={saving} aria-busy={saving}>
          {saving ? <><Spinner /> Saving…</> : step < STEPS.length ? <>Continue <ArrowRight aria-hidden="true" size={20} /></> : "Save and see my dashboard"}
        </button>
        {step > 1 && <button type="button" className="pz-btn pz-btn--ghost" onClick={() => setStep(step - 1)}><ArrowLeft aria-hidden="true" size={20} /> Back</button>}
      </div>
      <p className="text-caption text-ink-muted">We only ask what trial matching uses. Your details stay in your PhaseZero profile.</p>
    </form>
  );
}
