import type { Transcript } from "@/lib/ai/schemas/transcript";

/**
 * Transcripts of the takes of one recording, end to end: each take's times
 * are shifted by the takes before it, so a quote's time points into the
 * takes played one after the other. The missing audio between takes is shown
 * on the call page, never written into the transcript (data, not ours).
 */
export function joinTranscripts(parts: Transcript[]): Transcript {
  if (parts.length === 1) return parts[0]!;
  let offset = 0;
  const segments: Transcript["segments"] = [];
  for (const part of parts) {
    for (const s of part.segments)
      segments.push({ ...s, start: s.start + offset, end: s.end + offset });
    offset += part.durationSeconds ?? part.segments.at(-1)?.end ?? 0;
  }
  return {
    text: parts
      .map((p) => p.text.trim())
      .filter(Boolean)
      .join("\n\n"),
    language: parts.find((p) => p.language)?.language,
    durationSeconds: offset,
    segments,
  };
}
