// OWNER: Member 1 - real backend auth only (magic link or flagged demo login).
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function magic(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await auth.requestLink(email); setMsg("Check your email for a sign-in link."); }
    catch (err: any) { setMsg(err.message); } finally { setBusy(false); }
  }
  async function demo() {
    setBusy(true);
    try { await auth.demoLogin(); router.push("/onboarding"); } catch (err: any) { setMsg(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form onSubmit={magic} className="space-y-3">
        <label className="block">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <button disabled={busy} className="w-full rounded bg-brand-600 px-4 py-2 text-white">Email me a sign-in link</button>
      </form>
      <button onClick={demo} disabled={busy} className="w-full rounded border px-4 py-2">Use demo account (demo mode)</button>
      {msg && <p role="alert">{msg}</p>}
    </div>
  );
}
