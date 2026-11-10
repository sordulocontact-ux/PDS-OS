"use client";

import { StepSection } from "@/components/shell/journey/step-section";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { formatBriefDate } from "@/lib/framing/assess";
import { written } from "@/lib/framing/written";
import { strategyDocuments } from "@/lib/i18n/fr/strategy-documents";
import { liftStrategyReserve } from "@/lib/strategy/actions/documents";
import type { StrategyReserve } from "@/lib/strategy/execution-queries";
import { strategyReserveTone } from "@/lib/ui/state-tones";

const fr = { strategyDocuments };

/**
 * The reserves put on the Brief's versions (MKT-S1-16), open ones first,
 * one row each (`Rows` + `InfoRow`): what, who lifts it and by when, who
 * put it on which version, how it was lifted; « Lever » (outlined) for its
 * owner or the project's owner.
 */
export function ReservesList({
  projectId,
  reserves,
  versions,
  meId,
  isOwner,
}: {
  projectId: string;
  reserves: StrategyReserve[];
  // The Brief's version number of each document id (a plain object: a
  // function cannot cross to a client component).
  versions: Record<string, number>;
  meId: string | null;
  isOwner: boolean;
}) {
  const t = fr.strategyDocuments.reserves;
  if (reserves.length === 0) return null;
  const sorted = [...reserves].sort(
    (a, b) =>
      Number(a.status === "lifted") - Number(b.status === "lifted") ||
      (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"),
  );
  return (
    <StepSection title={t.listTitle}>
      <Rows label={t.listTitle}>
        {sorted.map((r) => (
          <InfoRow
            key={r.id}
            title={r.text}
            detail={[
              t.line(r.ownerName, r.dueOn ? formatBriefDate(r.dueOn) : "—"),
              t.from(r.createdByName, versions[r.documentId] ?? 0),
              r.status === "lifted" && r.liftedAt
                ? `${t.liftedLine(r.liftedByName ?? "—", formatDay(r.liftedAt))}${
                    r.liftNote ? ` — ${r.liftNote}` : ""
                  }`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            badge={
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={strategyReserveTone[r.status]} size="sm">
                  {r.status === "open" ? t.open : t.lifted}
                </StatusBadge>
                {r.status === "open" && (isOwner || r.ownerId === meId) && (
                  <DialogButton
                    label={t.lift}
                    variant="outline"
                    size="xs"
                    title={t.liftTitle}
                    description={t.liftBody}
                  >
                    {(close) => (
                      <ReasonForm
                        label={t.liftNote}
                        submitLabel={t.lift}
                        doneMessage={t.liftedToast}
                        required={false}
                        run={async (note) =>
                          written(
                            await liftStrategyReserve(projectId, r.id, note),
                          )
                        }
                        onDone={close}
                      />
                    )}
                  </DialogButton>
                )}
              </span>
            }
          />
        ))}
      </Rows>
    </StepSection>
  );
}
