import { BulletinCard } from "@/components/legal/formalities/bulletin-card";
import { DossierForm } from "@/components/legal/formalities/dossier-form";
import { OpenFormalityButton } from "@/components/legal/formalities/open-formality-button";
import { StepsPanel } from "@/components/legal/formalities/steps-panel";
import { PageSection } from "@/components/shell/page-section";
import { Fold } from "@/components/ui/fold";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { TitleFormality } from "@/lib/legal/formalities/types";
import { formalityTone } from "@/lib/ui/state-tones";
import { formatInstant } from "@/lib/utils/instant";

/** One title's SACEM 725: where it stands, the bulletin, the steps, the
 * dossier in its five sections — each miss on its own line (JUR-02) —, the
 * history. */
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
      // Folded, a bulletin still says where it stands.
      collapsible={!!f}
      action={
        f ? (
          <StatusBadge tone={formalityTone[f.status]}>
            {t.statuses[f.status]}
          </StatusBadge>
        ) : (
          <OpenFormalityButton
            projectId={projectId}
            masterId={title.masterId}
          />
        )
      }
    >
      {f && (
        <div className="flex flex-col gap-6">
          {/* The bulletin in head, at every step that follows it. */}
          <BulletinCard title={title.title} f={f} />
          {(f.submittedAt || f.completedAt) && (
            <div className="flex flex-wrap items-center gap-2">
              {f.submittedAt && (
                <span className="text-sm text-muted-foreground">
                  {t.page.submittedNote(formatInstant(f.submittedAt))}
                </span>
              )}
              {f.completedAt && (
                <span className="text-sm text-muted-foreground">
                  {t.page.completed(formatInstant(f.completedAt))}
                </span>
              )}
            </div>
          )}
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
          <StepsPanel projectId={projectId} f={f} />
          {f.documents.length > 0 &&
          !["collecting_data", "ready_to_generate", "action_required"].includes(
            f.status,
          ) ? (
            <Fold summary={fr.legalDocuments.bulletin.values}>
              <DossierForm projectId={projectId} title={title} />
            </Fold>
          ) : (
            <DossierForm projectId={projectId} title={title} />
          )}
          {f.history.length > 0 && (
            <section className="flex flex-col gap-2 border-t border-[color:var(--border-hairline)] pt-6">
              <h3 className="font-medium">{t.page.history}</h3>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {f.history.map((e) => (
                  <li key={e.id}>
                    {[t.events[e.kind] ?? e.kind, e.by, formatInstant(e.at)]
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
