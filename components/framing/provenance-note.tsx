import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { formatTimestamp } from "@/lib/labo/format";

/** Where a value comes from: the call, the moment, the exact words — or who dictated it. */
export function ProvenanceNote({
  provenance,
  projectId,
}: {
  provenance: Provenance | null;
  projectId: string;
}) {
  const t = fr.framing.provenance;
  if (!provenance)
    return <p className="text-xs text-muted-foreground">{t.manual}</p>;
  if (provenance.kind === "voice")
    return (
      <div className="grid gap-0.5 text-xs text-muted-foreground">
        <p>{t.dictatedBy(provenance.author)}</p>
        {provenance.quote && <q>{provenance.quote}</q>}
      </div>
    );

  return (
    <div className="grid gap-0.5 text-xs text-muted-foreground">
      <p>
        {t.from}{" "}
        {provenance.callId ? (
          <Link
            href={routes.projectCall(projectId, provenance.callId)}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {provenance.callTitle}
          </Link>
        ) : (
          provenance.callTitle
        )}
        {provenance.startSeconds !== null && (
          <span className="font-mono">
            {" "}
            {t.at} {formatTimestamp(provenance.startSeconds)}
          </span>
        )}
      </p>
      {provenance.located === "missing" && (
        <StatusBadge
          tone="danger"
          size="sm"
          className="h-auto justify-self-start py-0.5 whitespace-normal"
        >
          {t.missing}
        </StatusBadge>
      )}
      {provenance.quote && <q>{provenance.quote}</q>}
    </div>
  );
}
