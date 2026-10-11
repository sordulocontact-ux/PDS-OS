import Link from "next/link";

import { sourceLabel } from "@/components/framing/guide/source-quote";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { formatTimestamp } from "@/lib/labo/format";

const day = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

/** The anchor of a moment in a call's transcript (TranscriptPanel). */
export const transcriptAnchor = (seconds: number | null) =>
  seconds === null ? "transcript" : `t-${Math.floor(seconds)}`;

/**
 * A value's state and where it comes from, said the same way everywhere
 * (PROJ-BUG-02): a suggestion of PO to confirm, a value taken from the
 * project's records to verify, or confirmed by someone on a date. A call
 * source opens the passage in the transcript; a quote that is not in the
 * transcript reads « Source introuvable », never as a verified source.
 */
export function SourceLine({
  projectId,
  provenance,
  state,
  confirmed,
}: {
  projectId: string;
  provenance: Provenance | null;
  // proposed: stored by PO; record: read from the project, not stored yet.
  state: "proposed" | "record" | "known";
  confirmed?: { by: string | null; at: string | null };
}) {
  const t = fr.framing.provenance;
  const stateText =
    state === "known"
      ? t.confirmed(
          confirmed?.by ?? null,
          confirmed?.at ? day.format(new Date(confirmed.at)) : null,
        )
      : state === "record" && provenance?.kind === "record"
        ? t.toVerify(provenance.label)
        : t.suggestion;

  return (
    <span className="flex flex-col gap-1 text-caption text-muted-foreground">
      <span>
        {stateText}
        {provenance && state !== "record" && <> · {sourceLabel(provenance)}</>}
      </span>
      {provenance?.kind === "call" && (
        <CallSource projectId={projectId} provenance={provenance} />
      )}
    </span>
  );
}

function CallSource({
  projectId,
  provenance,
}: {
  projectId: string;
  provenance: Extract<Provenance, { kind: "call" }>;
}) {
  const t = fr.framing.provenance;
  if (provenance.located === "missing" || !provenance.callId)
    return (
      <StatusBadge tone="danger" size="sm" className="justify-self-start">
        {t.notFound}
      </StatusBadge>
    );
  const timed =
    provenance.located === "timed" && provenance.startSeconds !== null;
  return (
    <Link
      href={`${routes.projectCall(projectId, provenance.callId)}#${transcriptAnchor(
        timed ? provenance.startSeconds : null,
      )}`}
      className="w-fit underline underline-offset-4 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {timed
        ? t.openPassage(formatTimestamp(provenance.startSeconds!))
        : t.openTranscript}
    </Link>
  );
}
