"use client";

import Link from "next/link";
import { useState } from "react";

import { PartyDialog } from "@/components/framing/intel/party-dialog";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { clearLegalParty } from "@/lib/framing/actions/legal-parties";
import {
  partyDecisionText,
  type DocumentStatus,
  type LegalPartyBoard,
  type LegalPartyLine,
} from "@/lib/framing/legal-parties";
import { fr } from "@/lib/i18n/fr";
import { partyStatusTone } from "@/lib/ui/state-tones";

const day = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

/**
 * « Parties impliquées » (PROJ-BUG-03): every party the project's records
 * name, each qualified by a person — never by its role alone. A party not
 * qualified yet reads « À qualifier »; a contract found in Contrats is shown
 * as a lead, not applied. Roles nobody holds are named apart: no party.
 */
export function PartyLines({
  projectId,
  board,
  members,
  legacy,
  editable,
  nextHref,
}: {
  projectId: string;
  board: LegalPartyBoard;
  members: Array<{ personId: string; name: string }>;
  // A free-text answer written before the qualification, kept in sight.
  legacy: string | null;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingIntel.parties;
  const { pending, run } = useFramingAction();
  const [editing, setEditing] = useState<LegalPartyLine | null>(null);
  const nameOf = (personId: string) =>
    members.find((m) => m.personId === personId)?.name ?? null;

  return (
    <div className="flex flex-col gap-4">
      {legacy && <ToneCallout tone="neutral">{t.legacy(legacy)}</ToneCallout>}
      {board.lines.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)]">
          {board.lines.map((line) => {
            const d = line.decision;
            const status = d?.document_status as DocumentStatus | undefined;
            return (
              <li key={line.key} className="flex flex-col gap-1.5 py-3">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-body-md font-semibold break-words">
                    {line.name}
                    {line.roles.length > 0 && (
                      <span className="font-medium text-muted-foreground">
                        {" "}
                        · {line.roles.join(", ")}
                      </span>
                    )}
                  </span>
                  <StatusBadge
                    tone={status ? partyStatusTone[status] : "warning"}
                    size="sm"
                  >
                    {status ? t.statuses[status] : t.undecided}
                  </StatusBadge>
                </span>
                {d ? (
                  <span className="text-caption text-muted-foreground">
                    {partyDecisionText(line, nameOf)}
                    {" · "}
                    {t.decidedBy(
                      d.decided_by ? nameOf(d.decided_by) : null,
                      day.format(new Date(d.decided_at)),
                    )}
                  </span>
                ) : (
                  <span className="text-caption text-muted-foreground">
                    {t.found(line.origins.join(", "))}
                  </span>
                )}
                {!d && line.suggestion && (
                  <span className="text-caption">
                    {t.suggestion(
                      t.statuses[line.suggestion.status],
                      line.suggestion.contract.title,
                    )}
                  </span>
                )}
                {editable && (
                  <span className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant={d ? "outline" : "default"}
                      disabled={pending}
                      onClick={() => setEditing(line)}
                    >
                      {d ? t.edit : t.qualify}
                    </Button>
                    {d && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          run(() => clearLegalParty(projectId, line.key))
                        }
                      >
                        {t.clear}
                      </Button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {board.unassignedRoles.length > 0 && (
        <p className="text-caption text-muted-foreground">
          {t.unassigned(board.unassignedRoles)}
        </p>
      )}
      {board.lines.length > 0 && board.undecided === 0 && (
        <Link
          href={nextHref}
          className={buttonVariants({ size: "lg", className: "self-start" })}
        >
          {fr.framingIntel.guide.next}
        </Link>
      )}
      {editing && (
        <PartyDialog
          projectId={projectId}
          line={editing}
          members={members}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
