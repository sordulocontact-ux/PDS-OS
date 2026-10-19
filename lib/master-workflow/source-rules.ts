// What may be a mix's source and when the source asks again (ticket
// « Workflow Master » § 1 and § 2, proto `master-v2.html`). Pure, shared by
// the journey and the Source step: the code detects, a person confirms.

import type { AudioState } from "@/lib/catalog/title-rules";

// A maquette or a mise à plat: what a mix starts from. A mix found in the
// Catalogue is offered as the Mix final instead; a master never a source.
export const SOURCE_STATES: readonly AudioState[] = ["demo", "rough_mix"];

type Audio = { id: string; audioState: AudioState; createdAt: string };
type Source = {
  fileId: string;
  confirmedAt: string;
  vocalsFinal: boolean | null;
};

/** The versions a source may be, newest first (« la plus récente »). */
export const sourceCandidates = <A extends Audio>(audio: A[]): A[] =>
  audio
    .filter((a) => SOURCE_STATES.includes(a.audioState))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));

/** A version received after the confirmation, other than the source. */
export function newerThan<A extends Audio>(
  audio: A[],
  source: Source | null,
): A | null {
  if (!source) return null;
  const [latest] = sourceCandidates(audio);
  return latest &&
    latest.id !== source.fileId &&
    latest.createdAt > source.confirmedAt
    ? latest
    : null;
}

/** The vocals of the confirmed source are not final yet. */
export const vocalsAwaited = (source: Source | null) =>
  source?.vocalsFinal === false;

/** The source was replaced once the final vocals arrived. */
export const replacedForVocals = (
  sources: Array<{ vocalsFinal: boolean | null }>,
) =>
  sources[0]?.vocalsFinal === true &&
  sources.slice(1).some((s) => s.vocalsFinal === false);
