import { ProvenanceNote } from "@/components/framing/provenance-note";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";

/** Where a proposal comes from, in words: the call and its quote, or the dictation. */
export function sourceLabel(provenance: Provenance): string {
  if (provenance.kind === "voice")
    return fr.framing.provenance.dictatedBy(provenance.author);
  if (provenance.kind === "record") return provenance.label;
  if (provenance.kind === "generated")
    return fr.framing.provenance.generatedFrom(provenance.label);
  return provenance.callTitle
    ? fr.framingGuide.brief.callTitle(provenance.callTitle)
    : fr.framingGuide.unknownCall;
}

/** The words a proposal was taken from, and where they were said. */
export function SourceQuote({ provenance }: { provenance: Provenance }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-md bg-foreground px-1.5 text-caption font-semibold text-background"
        >
          {fr.framingGuide.poBadge}
        </span>
        <span className="break-words">
          {provenance.quote ? `« ${provenance.quote} »` : null}
          <span className="text-caption">
            {provenance.quote ? " · " : ""}
            {sourceLabel(provenance)}
          </span>
        </span>
      </span>
      <ProvenanceNote provenance={provenance} />
    </span>
  );
}
