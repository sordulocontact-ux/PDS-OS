/** Brief fields stored as versioned field_values. Pure code, importable anywhere. */

export const BRIEF_TEXT_FIELDS = ["objective", "timing", "frame"] as const;
export type BriefTextField = (typeof BRIEF_TEXT_FIELDS)[number];

export function isBriefTextField(value: string): value is BriefTextField {
  return (BRIEF_TEXT_FIELDS as readonly string[]).includes(value);
}

export type Provenance =
  | {
      kind: "call";
      quote: string;
      /** Set by code when the quote was searched in the transcript (lib/ai/provenance.ts). */
      located: "timed" | "found" | "missing" | null;
      startSeconds: number | null;
      callId: string | null;
      callTitle: string | null;
    }
  | {
      /** Dictated and accepted by a member; the audio is not kept. */
      kind: "voice";
      quote: string;
      author: string | null;
    };

export type BriefFieldState = {
  key: BriefTextField;
  value: string | null;
  status: "proposed" | "confirmed" | null;
  provenance: Provenance | null;
};

/** The current value of a field is its latest row; a rejection empties it. */
export function toBriefField(
  key: BriefTextField,
  row: { value: unknown; status: string | null } | undefined,
  provenance: Provenance | null,
): BriefFieldState {
  if (!row || row.status === "rejected" || typeof row.value !== "string") {
    return { key, value: null, status: null, provenance: null };
  }
  return {
    key,
    value: row.value,
    status: row.status === "proposed" ? "proposed" : "confirmed",
    provenance,
  };
}
