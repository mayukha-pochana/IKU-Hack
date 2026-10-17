// OWNER: Member 1 - health profile creation. Keep it short (minimal repetitive entry).
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { profile } from "@/lib/api";

export function ProfileForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const router = useRouter();
  const [f, setF] = useState({ display_name: "", age: "", conditions: "", location: "", preferred_language: "en" });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    profile.get().then((p) => setF({ display_name: p.display_name, age: String(p.age ?? ""), conditions: p.conditions.join(", "), location: p.location ?? "", preferred_language: p.preferred_language })).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try {
      await profile.put({
        display_name: f.display_name, age: f.age ? Number(f.age) : null,
        conditions: f.conditions.split(",").map((s) => s.trim()).filter(Boolean),
        location: f.location || null, preferred_language: f.preferred_language,
      });
      router.push(redirectTo);
    } catch (e: any) { setErr(e.message); }
  }
  const input = "mt-1 w-full rounded border p-2";
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 p-6">
      <h1 className="text-2xl font-bold">Your health profile</h1>
      <label className="block">Name<input required className={input} value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></label>
      <label className="block">Age<input type="number" className={input} value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} /></label>
      <label className="block">Conditions (comma separated)<input className={input} value={f.conditions} onChange={(e) => setF({ ...f, conditions: e.target.value })} /></label>
      <label className="block">Location<input className={input} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
      {err && <p role="alert" className="text-red-700">{err}</p>}
      <button className="rounded bg-brand-600 px-4 py-2 text-white">Save and continue</button>
    </form>
  );
}
