// Shared API client. Owner: Member 2 (Member 1 adds auth/profile section only).
import type * as T from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

async function req<R>(path: string, init: RequestInit = {}): Promise<R> {
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
  session: () => req<{ authenticated: boolean; email: string; demo_mode: boolean }>("/auth/session"),
  logout: () => req("/auth/logout", { method: "POST" }),
};
export const profile = {
  get: () => req<T.Profile>("/profile"),
  put: (p: Omit<T.Profile, "id" | "user_id">) => req<T.Profile>("/profile", json("PUT", p)),
};

// ---- Medications, schedule, adherence (Member 2) ----
export const prescriptions = {
  parse: (file: File) => { const f = new FormData(); f.append("file", file); return req<T.ParsedPrescription>("/prescriptions/parse", { method: "POST", body: f }); },
};
export const medications = {
  list: () => req<T.Medication[]>("/medications"),
  create: (m: unknown) => req<T.Medication>("/medications", json("POST", m)),
};
export const schedule = {
  today: () => req<T.Dose[]>("/schedule/today"),
  week: () => req<T.Dose[]>("/schedule/week"),
  setStatus: (id: string, status: T.DoseStatus) => req<T.Dose>(`/doses/${id}/status`, json("PATCH", { status })),
};
export const adherence = { summary: () => req<T.AdherenceSummary>("/adherence/summary") };

// ---- Trials ----
export const trials = {
  matches: () => req<T.TrialMatch[]>("/trials/matches"),
  search: (q: string) => req<T.Trial[]>(`/trials/search?q=${encodeURIComponent(q)}`),
  get: (nct: string) => req<T.Trial>(`/trials/${nct}`),
  bookmark: (nct_id: string) => req("/trials/bookmarks", json("POST", { nct_id })),
};

// ---- Check-ins & voice ----
export const checkins = {
  list: () => req<T.Checkin[]>("/health-checkins"),
  create: (c: unknown) => req<T.Checkin>("/health-checkins", json("POST", c)),
};
export const voice = {
  explain: async (body: unknown): Promise<Blob> => {
    const r = await fetch(`${BASE}/api/voice/explain`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new ApiError("voice_failed", "Voice unavailable", r.status);
    return r.blob();
  },
};
