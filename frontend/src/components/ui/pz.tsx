// PhaseZero UI primitives: thin React wrappers over the pz-* classes in globals.css.
// Owner: Member 2 (shared with Member 1). Status labels follow the design system's StatusBadge table.
import { AlertTriangle, Check, CircleHelp, Clock, Info, Minus, X } from "lucide-react";
import type { DoseStatus, MatchStatus } from "@/types";
import { cn } from "@/lib/utils";

/** The round scored tablet from the logo (used by Loader, BlisterPack, Toggle). */
export function Tablet({ className = "" }: { className?: string }) {
  return (
    <svg className={cn("pz-tab", className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="pz-tab__rim" cx="12" cy="12" r="11.5" />
      <circle className="pz-tab__body" cx="12" cy="12" r="10" />
      <circle className="pz-tab__face" cx="12" cy="12" r="8.6" />
      <path className="pz-tab__score" d="M3.8 12h16.4" transform="rotate(-45 12 12)" />
      <path className="pz-tab__shine" d="M6 8.5a7 7 0 0 1 3-3" />
    </svg>
  );
}

export function Spinner({ large = false }: { large?: boolean }) {
  return <span className={cn("pz-spin", large && "pz-spin--lg")} aria-hidden="true" />;
}

/** Never show a loader with no words. */
export function Loader({ label }: { label: string }) {
  return <div className="pz-loading" role="status"><Spinner large /><span>{label}</span></div>;
}

type Tone = "success" | "warning" | "danger" | "neutral";
const ICON = { success: Check, warning: CircleHelp, danger: X, neutral: Clock } as const;

export function Badge({ tone, children, icon = true }: { tone: Tone; children: React.ReactNode; icon?: boolean }) {
  const I = ICON[tone];
  return <span className={`pz-badge pz-badge--${tone}`}>{icon && <I aria-hidden="true" strokeWidth={2.5} />}{children}</span>;
}

// Same words the backend sends as update.label, so badges read the same everywhere.
export const MATCH_LABEL: Record<MatchStatus, { tone: Tone; label: string }> = {
  POTENTIAL_MATCH: { tone: "success", label: "Could be a fit" },
  MORE_INFORMATION_NEEDED: { tone: "warning", label: "We need to check" },
  KNOWN_CRITERIA_MISMATCH: { tone: "danger", label: "Not a fit right now" },
};

export function MatchBadge({ status }: { status: MatchStatus }) {
  const m = MATCH_LABEL[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function DoseBadge({ status, at }: { status: DoseStatus; at?: string }) {
  if (status === "TAKEN") return <Badge tone="success">Taken</Badge>;
  if (status === "MISSED") return <Badge tone="danger">Missed</Badge>;
  if (status === "SKIPPED") return <span className="pz-badge pz-badge--neutral"><Minus aria-hidden="true" strokeWidth={2.5} />Skipped</span>;
  return <Badge tone="neutral">{at ? `Due ${at}` : "Due"}</Badge>;
}

const NOTICE_ICON = { info: Info, warning: AlertTriangle, success: Check, danger: AlertTriangle } as const;
const NOTICE_ROLE = { info: "note", warning: "alert", success: "status", danger: "alert" } as const;

export function Notice({ tone = "info", children, className }: { tone?: keyof typeof NOTICE_ICON; children: React.ReactNode; className?: string }) {
  const I = NOTICE_ICON[tone];
  return (
    <div className={cn("pz-notice", `pz-notice--${tone}`, className)} role={NOTICE_ROLE[tone]}>
      <I aria-hidden="true" /><div className="min-w-0">{children}</div>
    </div>
  );
}

export function Stepper({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="pz-steps" role="group" aria-label="Profile setup progress">
      <div className="pz-steps__bar">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("pz-steps__seg", i < step - 1 && "pz-steps__seg--done", i === step - 1 && "pz-steps__seg--now")} />
        ))}
      </div>
      <span className="pz-steps__label">Step {step} of {total}: {label}</span>
    </div>
  );
}

export function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="pz-chip" aria-pressed={pressed} onClick={onClick}>
      <Check aria-hidden="true" strokeWidth={2.5} />{children}
    </button>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="pz-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="pz-seg__opt" onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

type FieldProps = { id: string; label: string; help?: string; error?: string | null; wide?: boolean } & React.InputHTMLAttributes<HTMLInputElement>;
export function TextField({ id, label, help, error, wide, className, ...input }: FieldProps) {
  const helpId = `${id}-help`;
  return (
    <div className={cn("pz-field", error && "pz-field--error", wide && "pz-field--wide", className)}>
      <label htmlFor={id} className="pz-field__label">{label}</label>
      <input id={id} className="pz-field__input" aria-invalid={error ? true : undefined} aria-describedby={help || error ? helpId : undefined} {...input} />
      {(error || help) && <span id={helpId} className="pz-field__help">{error || help}</span>}
    </div>
  );
}

export function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className="pz-toggle">
      <button id={id} type="button" role="switch" aria-checked={checked} className="pz-toggle__track" onClick={() => onChange(!checked)}>
        <span className="pz-toggle__thumb"><Tablet /></span>
      </button>
      <label htmlFor={id}>{label}</label>
    </span>
  );
}

export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof TypeError) return "We couldn't reach the PhaseZero server. Check it is running, then try again.";
  return e instanceof Error && e.message ? e.message : fallback;
}
