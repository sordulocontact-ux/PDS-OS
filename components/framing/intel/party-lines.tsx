"use client";

import Link from "next/link";

import { PartyChoice } from "@/components/framing/intel/party-choice";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import {
  partyDecisionText,
  type DocumentStatus,
  type LegalPartyBoard,
} from "@/lib/framing/legal-parties";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { partyStatusTone } from "@/lib/ui/state-tones";

const fr = { framingIntel };

const day = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

/**
 * « Parties impliquées » (PROJ-BUG-03): every party the project's records
 * name, each qualified by a person — never by its role alone —, in its line
 * with one click (PartyChoice, proto « Qualifier les parties », Sacha
 * 10/11/2026: a window per person was tedious), « n sur N à qualifier » above.
 * A party not qualified yet reads « À qualifier » for the others; a contract
 * found in Contrats is shown as a lead, not applied. Roles nobody holds are
 * named apart: no party.
 * Also in the card « 06 · Cadre juridique » once the question is answered,
 * one party per line, still qualified there while the dimension is open.
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
  // The question screen goes on to the next question; the card does not.
  nextHref?: string;
}) {
  const t = fr.framingIntel.parties;
  const nameOf = (personId: string) =>
    members.find((m) => m.personId === personId)?.name ?? null;

  return (
    <div className="flex flex-col gap-4">
      {legacy && <ToneCallout tone="neutral">{t.legacy(legacy)}</ToneCallout>}
      {editable && board.lines.length > 0 && (
        <p className="text-caption text-[color:var(--text-secondary)] tabular-nums">
          {t.toQualify(board.undecided, board.lines.length)}
        </p>
      )}
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
                  {/* The one who qualifies reads the state in the choice. */}
                  {!editable && (
                    <StatusBadge
                      tone={status ? partyStatusTone[status] : "warning"}
                      size="sm"
                    >
                      {status ? t.statuses[status] : t.undecided}
                    </StatusBadge>
                  )}
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
                  <PartyChoice
                    projectId={projectId}
                    line={line}
                    members={members}
                  />
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
      {nextHref && board.lines.length > 0 && board.undecided === 0 && (
        <Link
          href={nextHref}
          className={buttonVariants({ size: "lg", className: "self-start" })}
        >
          <ButtonRoll>{fr.framingIntel.guide.next}</ButtonRoll>
        </Link>
      )}
    </div>
  );
}
