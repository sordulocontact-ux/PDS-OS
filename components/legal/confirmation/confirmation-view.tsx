import Link from "next/link";
import { IconScale } from "nucleo-sharp-essential";

import { ConfirmButton } from "@/components/legal/confirmation/confirm-button";
import { SynthesisAction } from "@/components/legal/confirmation/synthesis-action";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { FactTable } from "@/components/ui/fact-table";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { Confirmation } from "@/lib/legal/confirmation/queries";
import { formatDateTime } from "@/lib/release/format";

/**
 * Juridique's third step: the dossier PO reformulates, section by section,
 * each line with its source and a way back to correct it; then the one
 * decision, « Confirmer le dossier », once every question has an answer.
 */
export function ConfirmationView({
  projectId,
  confirmation: c,
}: {
  projectId: string;
  confirmation: Confirmation;
}) {
  const t = fr.legal.confirmation;
  const framing = routes.projectLegalStep(projectId, "framing");
  const header = (
    <ProjectPageHeader title={t.title} description={t.description} />
  );

  if (c.status === "not_started")
    return (
      <div className="grid gap-8">
        {header}
        <EmptyState
          icon={IconScale}
          title={t.notStarted.title}
          body={t.notStarted.body}
          action={
            <Button nativeButton={false} render={<Link href={framing} />}>
              {t.notStarted.action}
            </Button>
          }
        />
      </div>
    );

  return (
    <div className="grid gap-8">
      {header}
      {c.status === "confirmed" && c.confirmedAt ? (
        <ToneCallout tone="success">
          {t.confirmed(formatDateTime(c.confirmedAt), c.confirmedBy)}{" "}
          {t.confirmedNote}{" "}
          <Link
            href={routes.projectLegalStep(projectId, "plan")}
            className="underline underline-offset-4"
          >
            {t.openPlan}
          </Link>
        </ToneCallout>
      ) : c.openQuestions > 0 ? (
        <ToneCallout tone="warning">
          {t.open(c.openQuestions)}{" "}
          <Link href={framing} className="underline underline-offset-4">
            {t.resume}
          </Link>
        </ToneCallout>
      ) : c.reopened ? (
        <ToneCallout tone="warning">{t.reopened}</ToneCallout>
      ) : null}

      {c.sections.map((section) => (
        <PageSection
          key={section.key}
          card
          id={`legal-synthesis-${section.key}`}
          title={t.sections[section.key].title}
          description={t.sections[section.key].description}
        >
          {section.facts.length === 0 ? (
            <EmptyNote>{t.empty}</EmptyNote>
          ) : (
            <FactTable
              facts={section.facts}
              renderAction={(action) => <SynthesisAction action={action} />}
            />
          )}
        </PageSection>
      ))}

      {c.status === "draft" && c.openQuestions === 0 && (
        <div className="flex flex-col items-end gap-3">
          <p className="text-sm text-muted-foreground">{t.notice}</p>
          <ConfirmButton projectId={projectId} />
        </div>
      )}
    </div>
  );
}
