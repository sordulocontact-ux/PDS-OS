import Link from "next/link";

import { MappingPanel } from "@/components/legal/contracts/mapping-panel";
import { ProjectPageActions } from "@/components/projects/project-page-actions";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { Agreements } from "@/lib/legal/contracts/queries";

/**
 * Contracts of a project (ticket Juridique 03): the mapping of the
 * agreements each credited person needs, then each agreement generated
 * from its template. Reached from the plan's and the Suivi's contracts.
 */
export function AgreementsView({
  projectId,
  agreements,
}: {
  projectId: string;
  agreements: Agreements;
}) {
  const t = fr.legalContracts.agreements;
  const templatesLink = (
    <Link
      href={routes.contractTemplates}
      className={buttonVariants({ variant: "outline", size: "lg" })}
    >
      {t.templates}
    </Link>
  );
  return (
    <div className="grid gap-8">
      <ProjectPageActions>{templatesLink}</ProjectPageActions>
      {!agreements.hasValidatedTemplate && (
        <ToneCallout tone="warning">{t.noTemplate}</ToneCallout>
      )}
      <PageSection
        card
        id="legal-agreements"
        title={t.mappingTitle}
        description={t.mappingDescription}
      >
        {agreements.rows.length === 0 ? (
          <EmptyNote>{t.empty}</EmptyNote>
        ) : (
          <MappingPanel
            projectId={projectId}
            rows={agreements.rows}
            approval={agreements.approval}
          />
        )}
      </PageSection>
    </div>
  );
}
