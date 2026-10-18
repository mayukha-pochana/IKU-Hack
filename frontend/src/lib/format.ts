// UK conventions from the design system: 24-hour times, dates as 18 Oct 2026.
export const time24 = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
export const dateUK = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const dateTimeUK = (iso: string) => `${dateUK(iso)}, ${time24(iso)}`;
export const weekdayShort = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short" });
export const weekdayLong = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long" });
export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Monday 00:00 of the week containing `d` (UK weeks start on Monday). */
export function mondayOf(d = new Date()) {
  const m = new Date(d); m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** True when `iso` falls on a later calendar day than today: those doses can't be logged yet. */
export function isLaterDay(iso: string, now = new Date()) {
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  return new Date(iso).getTime() > end.getTime();
}
