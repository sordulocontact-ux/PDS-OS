// What Whisper writes when nobody speaks (UX test of 09/10/2026: a silent
// 5-minute recording transcribed « Sous-titrage Société Radio-Canada », then
// « Compte rendu prêt »). Pure, so the rules are read in one place:
//   * a segment is silence when Whisper itself says so: no_speech_prob of at
//     least 0.6 with an average log-probability under -1 (OpenAI's own
//     no-speech thresholds), or no metadata at all (Groq returns null fields
//     on silence);
//   * a segment whose whole text is a known hallucination of the model
//     (subtitle credits, « merci d'avoir regardé »…) is dropped too.
// What is left rebuilds the text; nothing left = nothing heard, which the
// callers already refuse (calls: transcript_empty, dictation: nothing_heard).

const NO_SPEECH = 0.6;
const LOW_CONFIDENCE = -1;

// Folded (lower case, no accents, letters and digits only).
const HALLUCINATIONS = [
  "soustitragesocieteradiocanada",
  "soustitragestfr",
  "soustitresrealisesparlacommunautedamaraorg",
  "soustitresrealisespourlacommunautedamaraorg",
  "soustitragefrancetelevisions",
  "mercidavoirregarde",
  "mercidavoirregardecettevideo",
  "abonnezvous",
  "nhesitezpasavousabonner",
  "amaraorg",
];

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** A text made only of what Whisper invents on silence (or of nothing). */
export function isHallucination(text: string): boolean {
  const folded = fold(text);
  if (folded === "") return true;
  // « Sous-titrage Société Radio-Canada » repeated, or with a stray dot.
  return HALLUCINATIONS.some(
    (h) => folded === h || folded.replaceAll(h, "") === "",
  );
}

type Segment = Record<string, unknown>;

const numberOr = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Whisper's verdict on one segment of a verbose_json transcription. */
export function isSilentSegment(segment: Segment): boolean {
  const text = typeof segment.text === "string" ? segment.text : "";
  if (isHallucination(text)) return true;
  if (segment.no_speech_prob === null || segment.no_speech_prob === undefined)
    return segment.avg_logprob === null || segment.avg_logprob === undefined;
  return (
    numberOr(segment.no_speech_prob, 0) >= NO_SPEECH &&
    numberOr(segment.avg_logprob, 0) < LOW_CONFIDENCE
  );
}

/** The verbose_json payload without its silent segments, text rebuilt from
 * what remains; `dropped` says how many went. Without segments, only a
 * whole-text hallucination is removed. */
export function withoutSilence<
  P extends { text?: unknown; segments?: unknown },
>(payload: P): { payload: P; dropped: number } {
  if (!Array.isArray(payload.segments)) {
    const text = typeof payload.text === "string" ? payload.text : "";
    return isHallucination(text) && text !== ""
      ? { payload: { ...payload, text: "" }, dropped: 1 }
      : { payload, dropped: 0 };
  }
  const segments = payload.segments as Segment[];
  const kept = segments.filter((segment) => !isSilentSegment(segment));
  const dropped = segments.length - kept.length;
  if (dropped === 0) return { payload, dropped: 0 };
  const text = kept
    .map((segment) => (typeof segment.text === "string" ? segment.text : ""))
    .join("")
    .trim();
  return { payload: { ...payload, segments: kept, text }, dropped };
}
