import type { Transcript } from "@/lib/ai/schemas/transcript";

/**
 * Locates a model-provided quote in the transcript.
 * Deterministic code: the timestamp shown to the user always comes from here,
 * never from the model. A quote that cannot be found is reported as such —
 * it is the first signal of a hallucinated item.
 */

export type QuoteLocation =
  | { status: "timed"; start: number; end: number }
  | { status: "found" } // pasted text: present, but no timing available
  | { status: "missing" };

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function locateQuote(
  quote: string,
  transcript: Transcript,
): QuoteLocation {
  const needle = normalize(quote);
  if (needle.length === 0) return { status: "missing" };

  if (transcript.segments.length === 0) {
    return normalize(transcript.text).includes(needle)
      ? { status: "found" }
      : { status: "missing" };
  }

  // Normalized full text, remembering where each segment starts.
  let haystack = "";
  const offsets: number[] = [];
  for (const segment of transcript.segments) {
    offsets.push(haystack.length);
    haystack += `${normalize(segment.text)} `;
  }

  const index = haystack.indexOf(needle);
  if (index === -1) return { status: "missing" };

  const segmentAt = (position: number) => {
    let found = 0;
    for (let i = 0; i < offsets.length; i++) {
      if (offsets[i] <= position) found = i;
    }
    return transcript.segments[found];
  };

  return {
    status: "timed",
    start: segmentAt(index).start,
    end: segmentAt(index + needle.length - 1).end,
  };
}
