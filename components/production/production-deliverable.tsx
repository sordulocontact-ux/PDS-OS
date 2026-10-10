import { DeliveryStepButton } from "@/components/production/delivery-step-button";
import { FinalFileButton } from "@/components/production/final-file-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { ProductionDeliverable } from "@/lib/production/queries";
import { nextStep } from "@/lib/production/rules";
import { formatDate } from "@/lib/release/format";
import { productionDeliveryTone } from "@/lib/ui/state-tones";

const t = fr.production;

/**
 * One deliverable in Production: its creative source (the Conception's
 * validated version), its final file, the decisions taken (who, when) and
 * the next one, for whoever may take it while the Production runs.
 */
export function ProductionDeliverableItem({
  projectId,
  deliverable: d,
  canEdit,
  canApprove,
}: {
  projectId: string;
  deliverable: ProductionDeliverable;
  // The owner, while the Production is in progress.
  canEdit: boolean;
  // The owner or a creative director of the project, same condition.
  canApprove: boolean;
}) {
  const step = nextStep(d.state);
  const may = step === "approve" ? canApprove : step !== null ? canEdit : false;
  const decided = d.delivery
    ? (
        [
          ["approve", d.delivery.approvedBy, d.delivery.approvedAt],
          ["check", d.delivery.checkedBy, d.delivery.checkedAt],
          ["deliver", d.delivery.deliveredBy, d.delivery.deliveredAt],
        ] as const
      ).flatMap(([key, who, at]) =>
        at ? [t.decided[key](who ?? "—", formatDate(at))] : [],
      )
    : [];
  const meta = [
    d.leverLabel,
    d.assigneeName ? t.assignee(d.assigneeName) : null,
    d.dueDate ? t.due(formatDate(d.dueDate)) : null,
  ].filter(Boolean);

  return (
    <article className="grid gap-3 rounded-xl border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="font-medium break-words">{d.title}</h3>
          {meta.length > 0 && (
            <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
          )}
        </div>
        <StatusBadge
          tone={productionDeliveryTone[d.state]}
          className="shrink-0"
        >
          {t.states[d.state]}
        </StatusBadge>
      </header>

      <p className="text-sm text-muted-foreground">
        {d.approvedDesign ? (
          <>
            {t.source(d.approvedDesign.number)}
            {d.approvedDesign.href && (
              <>
                {" · "}
                <a
                  href={d.approvedDesign.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {t.openSource}
                </a>
              </>
            )}
          </>
        ) : (
          t.noSource
        )}
      </p>

      {d.delivery && (
        <div className="grid gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">{t.final} · </span>
            <a
              href={d.delivery.finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all underline underline-offset-4"
            >
              {t.open}
            </a>
          </p>
          {d.delivery.finalNote && (
            <p className="break-words text-muted-foreground">
              « {d.delivery.finalNote} »
            </p>
          )}
          {decided.map((line) => (
            <p key={line} className="text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
      )}

      {(canEdit || (may && step === "approve")) && (
        <div className="flex flex-wrap items-center gap-2">
          {step && may && (
            <DeliveryStepButton
              projectId={projectId}
              deliverableId={d.id}
              title={d.title}
              step={step}
            />
          )}
          {canEdit && (
            <FinalFileButton
              projectId={projectId}
              deliverableId={d.id}
              current={
                d.delivery
                  ? { url: d.delivery.finalUrl, note: d.delivery.finalNote }
                  : null
              }
            />
          )}
          {canEdit && d.delivery?.approvedAt && (
            <DeliveryStepButton
              projectId={projectId}
              deliverableId={d.id}
              title={d.title}
              step="reopen"
            />
          )}
        </div>
      )}
    </article>
  );
}
