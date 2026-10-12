import Link from "next/link";

import { ConfirmButton } from "@/components/legal/confirmation/confirm-button";
import { SynthesisAction } from "@/components/legal/confirmation/synthesis-action";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FactTable } from "@/components/ui/fact-table";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { Confirmation } from "@/lib/legal/confirmation/queries";
import { formatInstant } from "@/lib/utils/instant";

/** Where the dossier stands, said once at the top of the État des lieux:
 * confirmed (by whom, when, and the way to the plan), or reopened by a
 * correction. Nothing while questions are still being answered. */
export function ConfirmationStatus({
  projectId,
  confirmation: c,
}: {
  projectId: string;
  confirmation: Confirmation;
}) {
  const t = fr.legal.confirmation;
  if (c.status === "confirmed" && c.confirmedAt)
    return (
      <ToneCallout tone="success">
        {t.confirmed(formatInstant(c.confirmedAt), c.confirmedBy)}{" "}
        {t.confirmedNote}{" "}
        <Link
          href={routes.projectLegalStep(projectId, "plan")}
          className="underline underline-offset-4"
        >
          {t.openPlan}
        </Link>
      </ToneCallout>
    );
  if (c.reopened && c.openQuestions === 0)
    return <ToneCallout tone="warning">{t.reopened}</ToneCallout>;
  return null;
}

/**
 * The dossier PO reformulates (ticket Juridique 01: « PO reformule le
 * dossier, montre les corrections possibles et demande confirmation »),
 * part by part, each line with its source and a way back to its question;
 * then the one decision, « Confirmer le dossier ». Shown once every
 * question has an answer; folded away once confirmed.
 */
export function ConfirmationPanel({
  projectId,
  confirmation: c,
}: {
  projectId: string;
  confirmation: Confirmation;
}) {
  const t = fr.legal.confirmation;
  if (c.status === "not_started" || c.openQuestions > 0) return null;
  const confirmed = c.status === "confirmed";

  return (
    <PageSection
      card
      id="legal-dossier"
      title={confirmed ? t.confirmedTitle : t.toConfirmTitle}
      description={t.description}
      collapsible={confirmed}
      defaultOpen={!confirmed}
    >
      <div className="flex flex-col gap-8">
        {c.sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-medium">{t.sections[section.key].title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.sections[section.key].description}
              </p>
            </div>
            {section.facts.length === 0 ? (
              <EmptyNote>{t.empty}</EmptyNote>
            ) : (
              <FactTable
                facts={section.facts}
                renderAction={(action) => <SynthesisAction action={action} />}
              />
            )}
          </section>
        ))}
        {!confirmed && (
          <div className="flex flex-col items-end gap-3">
            <p className="text-sm text-muted-foreground">{t.notice}</p>
            <ConfirmButton projectId={projectId} />
          </div>
        )}
      </div>
    </PageSection>
  );
}
