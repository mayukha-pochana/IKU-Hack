// OWNER: Member 1 - single-page profile editor, reused by Member 2's /profile page.
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, profile } from "@/lib/api";
import { Loader, Notice, Spinner, errorMessage } from "@/components/ui/pz";
import { AboutFields, ConditionFields, ContactFields, HealthFields, LocationFields } from "./ProfileFields";
import { EMPTY, fromProfile, toPayload, validateDob, validateName, validatePhone, type Draft } from "./profileDraft";

export function ProfileForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [d, setD] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string | null>>>({});
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    profile.get().then((p) => setD(fromProfile(p))).catch(() => setD(EMPTY));
    auth.session().then((s) => setEmail(s.email)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!d) return; setMsg(null);
    const v = { display_name: validateName(d), dob: validateDob(d), phone: validatePhone(d) };
    setErrors(v); if (v.display_name || v.dob || v.phone) return;
    setSaving(true);
    try {
      await profile.put(toPayload(d));
      if (redirectTo) router.push(redirectTo);
      setMsg({ tone: "success", text: "Profile saved. Your trial matches will update." });
    } catch (e) { setMsg({ tone: "danger", text: errorMessage(e, "We couldn't save your profile. Please try again.") }); }
    finally { setSaving(false); }
  }

  if (!d) return <Loader label="Loading your profile…" />;
  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-6">
      <section className="pz-card"><h2 className="pz-card__title">About you</h2>
        <AboutFields d={d} set={setD} errors={errors} />
      </section>
      <section className="pz-card"><h2 className="pz-card__title">Contact details</h2><ContactFields d={d} set={setD} errors={errors} email={email} /></section>
      <section className="pz-card"><h2 className="pz-card__title">Your conditions</h2><ConditionFields d={d} set={setD} /></section>
      <section className="pz-card"><h2 className="pz-card__title">More about your health</h2><HealthFields d={d} set={setD} /></section>
      <section className="pz-card"><h2 className="pz-card__title">Location and travel</h2><LocationFields d={d} set={setD} /></section>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <button className="pz-btn pz-btn--primary w-full sm:w-auto sm:self-start" disabled={saving} aria-busy={saving}>{saving ? <><Spinner /> Saving…</> : "Save changes"}</button>
    </form>
  );
}
