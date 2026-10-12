"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { formatBriefDate } from "@/lib/framing/assess";
import type { ActionResult } from "@/lib/framing/result";
import { fr } from "@/lib/i18n/fr";
import { liftStrategyReserve } from "@/lib/strategy/actions/documents";
import type { StrategyReserve } from "@/lib/strategy/execution-queries";
import { strategyReserveTone } from "@/lib/ui/state-tones";
import type { WriteResult } from "@/lib/utils/write-result";

const written = (result: ActionResult): WriteResult =>
  result.ok ? result : { ok: false, error: fr.framing.errors[result.error] };

/**
 * The reserves put on the Brief's versions (MKT-S1-16), open ones first:
 * what, who lifts it and by when, who put it on which version; « Lever »
 * for its owner or the project's owner, with how it was lifted.
 */
export function ReservesList({
  projectId,
  reserves,
  versionOf,
  meId,
  isOwner,
}: {
  projectId: string;
  reserves: StrategyReserve[];
  versionOf: (documentId: string) => number | null;
  meId: string | null;
  isOwner: boolean;
}) {
  const t = fr.strategyDocuments.reserves;
  if (reserves.length === 0) return null;
  const sorted = [...reserves].sort(
    (a, b) =>
      Number(a.status === "lifted") - Number(b.status === "lifted") ||
      a.dueOn.localeCompare(b.dueOn),
  );
  return (
    <section aria-labelledby="reserves-title" className="flex flex-col gap-3">
      <h3 id="reserves-title" className="text-body-md font-semibold">
        {t.listTitle}
      </h3>
      <ul className="flex flex-col gap-2">
        {sorted.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-1.5 rounded-2xl border border-border px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-body-md font-medium break-words">
                {r.text}
              </span>
              <StatusBadge tone={strategyReserveTone[r.status]} size="sm">
                {r.status === "open" ? t.open : t.lifted}
              </StatusBadge>
            </div>
            <p className="text-caption text-muted-foreground">
              {t.line(r.ownerName, formatBriefDate(r.dueOn))}
            </p>
            <p className="text-caption text-muted-foreground">
              {t.from(r.createdByName, versionOf(r.documentId) ?? 0)}
            </p>
            {r.status === "lifted" && r.liftedAt && (
              <p className="text-caption text-muted-foreground">
                {t.liftedLine(r.liftedByName ?? "—", formatDay(r.liftedAt))}
                {r.liftNote ? ` — ${r.liftNote}` : ""}
              </p>
            )}
            {r.status === "open" && (isOwner || r.ownerId === meId) && (
              <div>
                <DialogButton
                  label={t.lift}
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
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
