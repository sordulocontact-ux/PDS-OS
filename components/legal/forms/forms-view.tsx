import { FormRowActions } from "@/components/legal/forms/form-row-actions";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { BackLink } from "@/components/shell/back-link";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { FormRow } from "@/lib/legal/forms/queries";
import { formatDate } from "@/lib/release/format";
import { legalFormTone } from "@/lib/ui/state-tones";

/**
 * Fiches de renseignements of a project (ticket Juridique 02): each credited
 * person, the state of their fiche, and what to do. Reached from the plan's
 * and the Suivi's « Récupérer les informations ».
 */
export function FormsView({
  projectId,
  rows,
}: {
  projectId: string;
  rows: FormRow[];
}) {
  const t = fr.legalForms.page;
  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-3">
        <BackLink href={routes.projectLegalStep(projectId, "tracking")}>
          {t.back}
        </BackLink>
        <ProjectPageHeader title={t.title} description={t.description} />
      </div>
      <PageSection card id="legal-forms" title={t.title}>
        {rows.length === 0 ? (
          <EmptyNote>{t.empty}</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium break-words">{row.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {row.creditRoles
                      .map((role) => fr.masterPage.credits.roles[role])
                      .join(" · ")}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex items-center gap-2">
                    {row.since && row.state !== "none" && (
                      <span className="text-sm text-muted-foreground">
                        {t.since(formatDate(row.since))}
                      </span>
                    )}
                    <StatusBadge tone={legalFormTone[row.state]}>
                      {t.states[row.state]}
                    </StatusBadge>
                  </div>
                  <FormRowActions projectId={projectId} row={row} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </div>
  );
}
