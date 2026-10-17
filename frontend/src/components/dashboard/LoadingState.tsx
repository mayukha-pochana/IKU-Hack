// OWNER: Member 2
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <p role="status" aria-live="polite" className="p-6 text-slate-600">{label}</p>;
}
