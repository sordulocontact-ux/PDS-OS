import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";

/** Where a proposal comes from, in words: the call and its quote, or the dictation. */
export function sourceLabel(provenance: Provenance): string {
  if (provenance.kind === "voice")
    return fr.framing.provenance.dictatedBy(provenance.author);
  return provenance.callTitle
    ? fr.framingGuide.brief.callTitle(provenance.callTitle)
    : fr.framingGuide.unknownCall;
}

/**
 * The caption line under a value: "Proposé" while PO's proposal is not
 * confirmed (AI Act), where it was said and the words, and the warning when
 * the quote could not be found in the transcription.
 */
export function SourceDetail({
  provenance,
  proposed,
}: {
  provenance: Provenance | null;
  proposed: boolean;
}) {
  if (!provenance && !proposed) return null;
  return (
    <>
      {proposed && <ProposedBadge />}
      {provenance && (
        <span className="break-words">
          {sourceLabel(provenance)}
          {provenance.quote ? ` · « ${provenance.quote} »` : ""}
        </span>
      )}
      <ProvenanceNote provenance={provenance} />
    </>
  );
}
