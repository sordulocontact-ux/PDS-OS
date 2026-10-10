import { HandoffButton } from "@/components/design/sheets/handoff-button";
import { SheetVersionCard } from "@/components/design/sheets/sheet-version-card";
import { SubmitSheetButton } from "@/components/design/sheets/submit-sheet-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatDateTime } from "@/lib/calls/format";
import type { SheetFull } from "@/lib/design/sheets";
import { fr } from "@/lib/i18n/fr";

/**
 * Validation of a Fiche Livrable: submit (responsible or chef de projet),
 * each version with its decisions — a validator decides what is open — then
 * the handoff of the latest validated version to Production, by a person.
 */
export function SheetReview({
  projectId,
  sheet: s,
  canSubmit,
  isOwner,
  isValidator,
  nameOf,
}: {
  projectId: string;
  sheet: SheetFull;
  canSubmit: boolean;
  isOwner: boolean;
  isValidator: boolean;
  nameOf: (personId: string | null) => string;
}) {
  const t = fr.conceptionSheet;
  const latest = s.versions[0] ?? null;
  const approved = s.versions.find((v) => v.status === "approved") ?? null;
  const handed = s.handoffs[0] ?? null;
  const pending = latest?.status === "pending";
  const submittable =
    canSubmit &&
    !pending &&
    (s.status === "draft" ||
      s.status === "to_complete" ||
      s.status === "ready" ||
      s.status === "rejected");

  return (
    <div className="flex flex-col gap-5">
      {pending && (
        <ToneCallout tone="warning">
          {t.review.pending(latest.number)}
          {isValidator && ` · ${t.review.validatorNote}`}
        </ToneCallout>
      )}
      {approved &&
        s.status !== "ready_for_production" &&
        s.status !== "transferred" && (
          <ToneCallout tone="info">{t.newVersion(approved.number)}</ToneCallout>
        )}
      {submittable && (
        <SubmitSheetButton
          projectId={projectId}
          sheetId={s.sheet.id}
          blocked={s.checks.blockers.length > 0}
        />
      )}

      {approved && (
        <div className="flex flex-col gap-3">
          {handed && (
            <p className="text-body-md text-muted-foreground">
              {t.handoff.transferred(
                handed.number,
                formatDateTime(handed.confirmedAt),
              )}
            </p>
          )}
          {handed && handed.number < approved.number && (
            <ToneCallout tone="warning">
              {t.handoff.newer(handed.number, approved.number)}
            </ToneCallout>
          )}
          {isOwner && handed?.number !== approved.number && (
            <HandoffButton
              projectId={projectId}
              sheetId={s.sheet.id}
              version={approved.number}
              refresh={Boolean(handed)}
            />
          )}
        </div>
      )}

      <section aria-labelledby="sheet-versions" className="flex flex-col gap-3">
        <h3 id="sheet-versions" className="text-body-md font-semibold">
          {t.review.versions}
        </h3>
        {s.versions.length === 0 ? (
          <EmptyNote>{t.review.neverSubmitted}</EmptyNote>
        ) : (
          s.versions.map((v, i) => (
            <SheetVersionCard
              key={v.id}
              projectId={projectId}
              version={v}
              nameOf={nameOf}
              isValidator={isValidator}
              open={i === 0}
            />
          ))
        )}
      </section>
    </div>
  );
}
