import { DossierForm } from "@/components/legal/formalities/dossier-form";
import { OpenFormalityButton } from "@/components/legal/formalities/open-formality-button";
import { StepsPanel } from "@/components/legal/formalities/steps-panel";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { formalityMissingLabel } from "@/lib/legal/formalities/definition";
import type { TitleFormality } from "@/lib/legal/formalities/types";
import { formatDate, formatDateTime } from "@/lib/release/format";
import { clearanceTone, formalityTone } from "@/lib/ui/state-tones";

/** One title's SACEM 725: where it stands, what it still needs, its
 * borrowings, the dossier, the steps, the history. */
export function FormalityCard({
  projectId,
  title,
}: {
  projectId: string;
  title: TitleFormality;
}) {
  const t = fr.legalFormalities;
  const f = title.formality;
  return (
    <PageSection
      card
      id={`formality-${title.masterId}`}
      title={title.title}
      description={t.definitions.SACEM_725_EDITED_WORK}
      action={
        !f && (
          <OpenFormalityButton
            projectId={projectId}
            masterId={title.masterId}
          />
        )
      }
    >
      {f && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={formalityTone[f.status]}>
              {t.statuses[f.status]}
            </StatusBadge>
            {f.submittedAt && (
              <span className="text-sm text-muted-foreground">
                {t.page.submittedNote(formatDate(f.submittedAt))}
              </span>
            )}
            {f.completedAt && (
              <span className="text-sm text-muted-foreground">
                {t.page.completed(formatDate(f.completedAt))}
              </span>
            )}
          </div>
          {f.reopened.length > 0 && (
            <ToneCallout tone="warning">
              {t.page.reopened(
                f.reopened.map((k) => t.fields[k] ?? k).join(", "),
              )}
            </ToneCallout>
          )}
          {f.partialReason && (
            <ToneCallout tone="neutral">
              {t.page.partialDone(f.partialReason)}
            </ToneCallout>
          )}
          {f.missing.length > 0 &&
            !["submitted", "processing", "completed"].includes(f.status) && (
              <ToneCallout tone="warning">
                {t.page.needs}{" "}
                {f.missing.map(formalityMissingLabel).join(" · ")}
              </ToneCallout>
            )}
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">{t.page.borrowings}</h3>
            {title.borrowings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.page.noBorrowing}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {title.borrowings.map((b) => (
                  <li key={b.work}>
                    <StatusBadge tone={clearanceTone[b.status]} size="sm">
                      « {b.work} » · {fr.legalClearance.statuses[b.status]}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <StepsPanel projectId={projectId} title={title.title} f={f} />
          <DossierForm projectId={projectId} title={title} />
          {f.history.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="font-medium">{t.page.history}</h3>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {f.history.map((e) => (
                  <li key={e.id}>
                    {[t.events[e.kind] ?? e.kind, e.by, formatDateTime(e.at)]
                      .filter(Boolean)
                      .join(" · ")}
                    {e.note && (
                      <span className="text-foreground"> — {e.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </PageSection>
  );
}
