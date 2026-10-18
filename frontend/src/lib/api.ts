// Shared API client. Owner: Member 2 (Member 1 adds auth/profile section only).
import type * as T from "@/types";
import { PreviewError, isPreview, previewRequest } from "./preview";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

async function fromPreview<R>(path: string, init: RequestInit): Promise<R> {
  try { return (await previewRequest(path, init)) as R; }
  catch (e) { if (e instanceof PreviewError) throw new ApiError(e.code, e.message, e.status); throw e; }
}

async function req<R>(path: string, init: RequestInit = {}): Promise<R> {
  if (isPreview()) return fromPreview<R>(path, init); // local-only sample data, see lib/preview.ts
  const isForm = init.body instanceof FormData;
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include", // HTTP-only session cookie
    ...init,
    headers: isForm ? init.headers : { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => null);
    throw new ApiError(e?.error?.code ?? "unknown", e?.error?.message ?? res.statusText, res.status);
  }
  return res.status === 204 ? (undefined as R) : res.json();
}
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

// ---- Auth & profile (Member 1) ----
export const auth = {
  requestLink: (email: string) => req<{ status: string }>("/auth/request-link", json("POST", { email })),
  demoLogin: () => req<{ status: string }>("/auth/demo-login", { method: "POST" }),
  verify: (token: string) => req<{ status: string }>(`/auth/verify?token=${encodeURIComponent(token)}`),
  session: () => req<{ authenticated: boolean; email: string; demo_mode: boolean }>("/auth/session"),
  logout: () => req("/auth/logout", { method: "POST" }),
};
export const profile = {
  get: () => req<T.Profile>("/profile"),
  put: (p: Omit<T.Profile, "id" | "user_id">) => req<T.Profile>("/profile", json("PUT", p)),
};

// ---- Medications, schedule, adherence (Member 2) ----
export const prescriptions = {
  /** 1 to 3 photos of the same label (sides of a bottle). */
  parse: (photos: File[]) => { const f = new FormData(); photos.forEach((p) => f.append("files", p)); return req<T.ParsedPrescription>("/prescriptions/parse", { method: "POST", body: f }); },
};
export const medications = {
  list: () => req<T.Medication[]>("/medications"),
  create: (m: T.MedicationCreate) => req<T.Medication>("/medications", json("POST", m)),
  /** As-needed medicines: record a dose at the moment it was taken. */
  logDose: (id: string) => req<T.Dose>(`/medications/${id}/doses`, { method: "POST" }),
  /** Stop (or never start) a medicine: future doses are removed, history is kept. */
  stop: (id: string) => req<T.Medication>(`/medications/${id}/stop`, { method: "POST" }),
};
export const schedule = {
  today: () => req<T.Dose[]>("/schedule/today"),
  week: () => req<T.Dose[]>("/schedule/week"),
  setStatus: (id: string, status: T.DoseStatus) => req<T.Dose>(`/doses/${id}/status`, json("PATCH", { status })),
};
export const adherence = {
  summary: () => req<T.AdherenceSummary>("/adherence/summary"),
  history: () => req<T.AdherenceDay[]>("/adherence/history"),
};

// ---- Trials ----
export const trials = {
  matches: () => req<T.TrialMatch[]>("/trials/matches"),
  search: async (q: string): Promise<{ trials: T.Trial[]; source: "live" | "cache" }> => {
    if (isPreview()) return { trials: await fromPreview<T.Trial[]>(`/trials/search?q=${encodeURIComponent(q)}`, {}), source: "live" };
    const r = await fetch(`${BASE}/api/trials/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
    if (!r.ok) { const e = await r.json().catch(() => null); throw new ApiError(e?.error?.code ?? "unknown", e?.error?.message ?? r.statusText, r.status); }
    return { trials: await r.json(), source: r.headers.get("X-Trials-Source") === "cache" ? "cache" : "live" };
  },
  get: (nct: string) => req<T.Trial>(`/trials/${nct}`),
  explain: (nct: string) => req<T.TrialExplanation>(`/trials/${encodeURIComponent(nct)}/explain`, { method: "POST" }),
  bookmark: (nct_id: string) => req("/trials/bookmarks", json("POST", { nct_id })),
  bookmarks: () => req<{ nct_id: string; created_at: string }[]>("/trials/bookmarks"),
};

// ---- Check-ins ----
export const checkins = {
  list: () => req<T.Checkin[]>("/health-checkins"),
  create: (c: T.CheckinCreate) => req<T.Checkin>("/health-checkins", json("POST", c)),
};

// ---- Trial updates (CareFlow keeps opened trials up to date; see docs/agent-frontend-handover.md) ----
export const updates = {
  list: () => req<T.UpdatesResponse>("/agent/updates"),
  markSeen: (nctIds?: string[]) => req<void>("/agent/updates/seen", json("POST", { nct_ids: nctIds ?? null })),
  correct: (c: T.Correction) => req<unknown>("/agent/corrections", json("POST", c)),
};
