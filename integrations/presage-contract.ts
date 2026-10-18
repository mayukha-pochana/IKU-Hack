/** Member 2 can import/copy this interface without loading any native SDK in Next.js. */
export interface PresageCaptureSession {
  capture_token: string;
  expires_in_seconds: number;
  runtime: 'careflow-presage-desktop';
  browser_supported: false;
}

export interface PresageResultPreview {
  user_id: string;
  measurement_id: string;
  measured_at: string;
  heart_rate: number | null;
  breathing_rate: number | null;
  sdk_version: string;
  platform: 'darwin-arm64' | 'linux-x64' | 'linux-arm64' | 'win32-x64';
}

export interface HealthCheckin {
  id: string;
  heart_rate: number | null;
  breathing_rate: number | null;
  symptom_report: string | null;
  measurement_source: 'presage_smartspectra' | 'symptom_report';
  recorded_at: string;
}

export interface CheckinSubmission {
  consent: true;
  measurement_token?: string;
  symptom_report?: string;
}

export type PresageCheckinState =
  | { phase: 'idle' }
  | { phase: 'requesting_session' }
  | { phase: 'awaiting_desktop'; session: PresageCaptureSession }
  | { phase: 'review'; token: string; preview: PresageResultPreview }
  | { phase: 'saving' }
  | { phase: 'saved'; checkin: HealthCheckin }
  | { phase: 'unavailable' | 'error'; message: string };

/** For display only. Server verifies signature, ownership, expiry, and replay. */
export function previewPresageReceipt(token: string): PresageResultPreview {
  if (token.length > 4096) throw new Error('Invalid measurement receipt');
  const parts = token.trim().split('.');
  if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1])) throw new Error('Invalid measurement receipt');
  const payload = parts[0].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(payload + '='.repeat((4 - payload.length % 4) % 4)), c => c.charCodeAt(0));
  const value = JSON.parse(new TextDecoder().decode(bytes));
  const validRate = (rate: unknown, max: number) => rate === null || (typeof rate === 'number' && Number.isFinite(rate) && rate > 0 && rate <= max);
  if (!value || typeof value.measurement_id !== 'string' || typeof value.user_id !== 'string' ||
      typeof value.sdk_version !== 'string' || !['darwin-arm64', 'linux-x64', 'linux-arm64', 'win32-x64'].includes(value.platform) ||
      !Number.isFinite(Date.parse(value.measured_at)) || !validRate(value.heart_rate, 350) || !validRate(value.breathing_rate, 100) ||
      (value.heart_rate === null && value.breathing_rate === null)) throw new Error('Invalid measurement receipt');
  return value;
}
