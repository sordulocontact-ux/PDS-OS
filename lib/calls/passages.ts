import type { Transcript } from "@/lib/ai/schemas/transcript";

/** One line of a transcript: who spoke when the source says it, its words,
 * its second when it is timed. Client-safe. */
export type Passage = {
  speaker: string | null;
  text: string;
  at: number | null;
};

// « [02:22] Sarah Benali : On propose 10 ans. », « Élise Fabre: Très bien. »:
// a time between brackets, then a name of a few words, then a colon. A
// sentence with a colon (« Je note : seuils… ») is not a name: at most five
// words, letters only.
const LINE =
  /^\s*(?:\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*)?(?:([\p{L}][\p{L}\p{M}'’.\- ]{0,58}?)\s*:\s+)?(.+)$/u;

const secondsOf = (h: string, m: string, s?: string) =>
  s === undefined
    ? Number(h) * 60 + Number(m)
    : Number(h) * 3600 + Number(m) * 60 + Number(s);

/**
 * The transcript as lines (Sacha 22/11/2026: the passage PO quotes opens in
 * its transcript, and who said it is shown): its segments when it is timed
 * (a recording, a Meet), else its text cut at each line, the speaker read
 * from « Nom : » — by code, never by the model.
 */
export function passagesOf(transcript: Transcript): Passage[] {
  if (transcript.segments.length > 0)
    return transcript.segments.map((segment) => ({
      speaker: segment.speaker?.trim() || null,
      text: segment.text.trim(),
      at: segment.start,
    }));
  return transcript.text.split(/\r?\n/).flatMap((raw): Passage[] => {
    const line = raw.trim();
    if (!line) return [];
    const match = LINE.exec(line);
    const name = match?.[4]?.trim();
    const said = match?.[5]?.trim();
    const isName = Boolean(name && said && name.split(/\s+/).length <= 5);
    return [
      {
        speaker: isName ? (name ?? null) : null,
        text: isName && said ? said : line.replace(/^\[[\d:]+\]\s*/, ""),
        at: match?.[1] ? secondsOf(match[1], match[2], match[3]) : null,
      },
    ];
  });
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** The line where `quote` is said: the one holding it, else the one where it
 * starts (a quote across two lines); -1 when it is not found. */
export function passageOf(passages: Passage[], quote: string): number {
  const needle = normalize(quote);
  if (!needle) return -1;
  const lines = passages.map((p) => normalize(p.text));
  const whole = lines.findIndex((line) => line.includes(needle));
  if (whole >= 0) return whole;
  const start = needle.split(" ").slice(0, 4).join(" ");
  return lines.findIndex((line) => line.includes(start));
}
