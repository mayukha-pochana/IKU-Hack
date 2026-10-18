export const MIN_CAPTURE_MS = 30_000;
export const MAX_CAPTURE_MS = 60_000;
export const FRESH_SAMPLE_MS = 10_000;

/** Keep independent real SDK samples; missing updates never erase another metric. */
export class MeasurementTracker {
  constructor() { this.samples = {}; }

  ingest(metrics, now) {
    for (const [name, series, maximum] of [
      ['heart_rate', metrics.cardio?.pulseRate, 350],
      ['breathing_rate', metrics.breathing?.rate, 100],
    ]) {
      const sample = series?.findLast(value => value.stable === true && Number.isFinite(value.value) && value.value > 0 && value.value <= maximum);
      if (!sample) continue;
      const identity = `${sample.timestamp ?? ''}:${sample.value}`;
      if (this.samples[name]?.identity === identity) continue;
      this.samples[name] = { value: sample.value, receivedAt: now, identity };
    }
  }

  values(now) {
    const result = {};
    for (const name of ['heart_rate', 'breathing_rate']) {
      const sample = this.samples[name];
      result[name] = sample && now - sample.receivedAt <= FRESH_SAMPLE_MS ? sample.value : null;
    }
    return result;
  }

  shouldStop(startedAt, now) {
    const values = this.values(now);
    return now - startedAt >= MAX_CAPTURE_MS ||
      (now - startedAt >= MIN_CAPTURE_MS && values.heart_rate !== null && values.breathing_rate !== null);
  }

  result(startedAt, now) {
    if (now - startedAt < MIN_CAPTURE_MS) return null;
    const values = this.values(now);
    return values.heart_rate === null && values.breathing_rate === null ? null : values;
  }
}
