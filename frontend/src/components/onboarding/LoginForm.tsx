// OWNER: Member 1 - real backend auth only (magic link, or the server-flagged demo login).
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FlaskConical, Mail } from "lucide-react";
import { ApiError, auth } from "@/lib/api";
import { Notice, Spinner, TextField, errorMessage } from "@/components/ui/pz";
import { destinationAfterSignIn } from "./routing";
import { previewAvailable, setPreview } from "@/lib/preview";
import { isNativeApp } from "@/lib/native";

type Busy = null | "link" | "demo";

export function LoginForm() {
  // The developer-only preview option is hidden inside the phone app.
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(isNativeApp()), []);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<{ text: string; emailOff?: boolean } | null>(null);

  // Already signed in? Skip this screen.
  useEffect(() => {
    auth.session().then(async () => router.replace(await destinationAfterSignIn())).catch(() => {});
  }, [router]);

  async function magic(e: React.FormEvent) {
    e.preventDefault(); setBusy("link"); setErr(null);
    try { await auth.requestLink(email); setSent(true); }
    catch (e) {
      const emailOff = e instanceof ApiError && e.code === "email_not_configured";
      setErr({ text: emailOff ? "Email sign-in isn't set up on this server yet. Use the demo account below instead." : errorMessage(e), emailOff });
    } finally { setBusy(null); }
  }

  async function demo() {
    setBusy("demo"); setErr(null);
    try { await auth.demoLogin(); router.push(await destinationAfterSignIn()); }
    catch (e) {
      const off = e instanceof ApiError && e.code === "demo_disabled";
      setErr({ text: off ? "The demo account is turned off on this server. Ask the team to set DEMO_AUTH_ENABLED=true." : errorMessage(e) });
      setBusy(null);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-h1">Check your email</h1>
        <p className="text-body-lg text-ink-muted">We sent a sign-in link to <strong className="text-ink">{email}</strong>. It works once and expires soon.</p>
        <button type="button" className="pz-btn pz-btn--ghost self-start" onClick={() => setSent(false)}>Use a different email</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Sign in or create your profile</h1>
        <p className="text-ink-muted">No password needed. We&apos;ll email you a link.</p>
      </div>
      <form onSubmit={magic} className="flex flex-col gap-4" noValidate={false}>
        <TextField id="email" label="Email address" type="email" autoComplete="email" required wide
          value={email} onChange={(e) => setEmail(e.target.value)} help="We only use this to sign you in." />
        <button className="pz-btn pz-btn--primary" disabled={busy !== null} aria-busy={busy === "link"}>
          {busy === "link" ? <><Spinner /> Sending link…</> : <><Mail aria-hidden="true" size={20} /> Email me a link</>}
        </button>
      </form>
      {err && <Notice tone={err.emailOff ? "warning" : "danger"}>{err.text}</Notice>}
      <div className="flex items-center gap-3 text-label text-ink-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={demo} disabled={busy !== null} aria-busy={busy === "demo"} className="pz-btn pz-btn--secondary">
          {busy === "demo" ? <><Spinner /> Signing in…</> : <><FlaskConical aria-hidden="true" size={20} /> Try the demo account</>}
        </button>
        <p className="text-caption text-ink-muted">Demo mode: signs you in as Barbara, a sample patient. All data is synthetic.</p>
      </div>
      {previewAvailable && !inApp && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-line-strong p-4">
          <button type="button" className="pz-btn pz-btn--ghost !justify-start !px-0 text-left" onClick={() => { setPreview(true); router.push("/dashboard"); }}>
            <Eye aria-hidden="true" size={20} /> Preview the app without the backend
          </button>
          <p className="text-caption text-ink-muted">Local development only. Uses sample data kept in this browser tab, so you can click through the screens.</p>
        </div>
      )}
    </div>
  );
}
