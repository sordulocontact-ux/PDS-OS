import { ConceptionDeliverableRow } from "@/components/design/conception-deliverable-row";
import { EmptyNote } from "@/components/shell/empty-state";
import type { ConceptionDeliverable } from "@/lib/design/conception";
import type { SheetSummary } from "@/lib/design/sheet-summaries";
import { fr } from "@/lib/i18n/fr";

/**
 * The Conception's deliverables at a glance: those the Stratégie committed
 * to (confirmed), apart from the needs added late (still to qualify). Each
 * one a compact line that unfolds.
 */
export function ConceptionDeliverables({
  projectId,
  deliverables,
  sheets,
  canWork,
  canRemove,
  action,
}: {
  projectId: string;
  deliverables: ConceptionDeliverable[];
  // The Fiche Livrable of each deliverable, when it has one.
  sheets: SheetSummary[];
  canWork: boolean;
  canRemove: boolean;
  // « Ajouter un livrable », for the owner.
  action?: React.ReactNode;
}) {
  const t = fr.conception.deliverables;
  const confirmed = deliverables.filter((d) => d.status === "confirmed");
  const toQualify = deliverables.filter((d) => d.status === "to_qualify");
  const list = (items: ConceptionDeliverable[], removable: boolean) => (
    <ul className="flex flex-col gap-2">
      {items.map((d) => (
        <li key={d.id}>
          <ConceptionDeliverableRow
            projectId={projectId}
            deliverable={d}
            sheet={sheets.find((s) => s.deliverableId === d.id) ?? null}
            canWork={canWork}
            canRemove={removable}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-labelledby="conception-deliverables"
      className="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3
            id="conception-deliverables"
            className="text-body-lg font-semibold"
          >
            {t.title}
          </h3>
          <p className="text-caption text-muted-foreground tabular-nums">
            {t.summary(confirmed.length, toQualify.length)}
          </p>
        </div>
        {action}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-body-md font-medium">{t.confirmedTitle}</h4>
        {confirmed.length ? (
          list(confirmed, false)
        ) : (
          <EmptyNote>{t.empty}</EmptyNote>
        )}
      </div>

      {/* Only shown once there is one: the entry stays light. */}
      {toQualify.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-body-md font-medium">{t.toQualifyTitle}</h4>
            <p className="text-caption text-muted-foreground">
              {t.toQualifyHint}
            </p>
          </div>
          {list(toQualify, canRemove)}
        </div>
      )}
    </section>
  );
}
