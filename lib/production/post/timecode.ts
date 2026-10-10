// Timecodes of a feedback (parcours 17): typed as mm:ss or hh:mm:ss, stored
// in milliseconds (production_version_comments.timecode_ms, at most 24 h).
// Parsed and written by the code only. Client-safe.

const MAX_MS = 24 * 3600 * 1000;
const HMS = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/;
const MS = /^(\d{1,4}):([0-5]\d)$/;

export type ParsedTimecode = { ok: true; ms: number | null } | { ok: false };

/**
 * "01:24" → 84 000 ms, "1:02:03" → 3 723 000 ms; empty → null (a general
 * comment). Anything else is refused rather than guessed.
 */
export function parseTimecode(input: string): ParsedTimecode {
  const value = input.trim();
  if (value === "") return { ok: true, ms: null };
  const hms = HMS.exec(value);
  const ms = hms ? null : MS.exec(value);
  const [hours, minutes, seconds] = hms
    ? [Number(hms[1]), Number(hms[2]), Number(hms[3])]
    : ms
      ? [0, Number(ms[1]), Number(ms[2])]
      : [NaN, NaN, NaN];
  if (Number.isNaN(hours)) return { ok: false };
  const total = ((hours * 60 + minutes) * 60 + seconds) * 1000;
  return total <= MAX_MS ? { ok: true, ms: total } : { ok: false };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 84 000 → "01:24"; 3 723 000 → "1:02:03". */
export function formatTimecode(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
