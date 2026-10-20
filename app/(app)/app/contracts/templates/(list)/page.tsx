import { IconFile } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { TemplateFormButton } from "@/components/contracts/templates/template-form-button";
import { TemplatesTable } from "@/components/contracts/templates/templates-table";
import { BackLink } from "@/components/shell/back-link";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listTemplateSeries } from "@/lib/legal/contracts/templates";

export const metadata = {
  title: `${fr.legalContracts.templates.title} · ${fr.contracts.title} · ${fr.app.name}`,
};

/**
 * The library of contract templates (ticket Juridique 03): pasted by a
 * human, validated by the director, never edited; reserved to manage_legal.
 */
export default async function ContractTemplatesPage() {
  const access = await requireApproved();
  if (!can(access, "manage_legal") || !access.organizationId) notFound();
  const organizationId = access.organizationId;
  const templates = await listTemplateSeries(access);
  const t = fr.legalContracts.templates;

  return (
    <PageContainer>
      <BackLink href={routes.contracts}>{t.back}</BackLink>
      <PageHeader
        title={t.title}
        description={t.description}
        action={
          templates.length > 0 ? (
            <TemplateFormButton organizationId={organizationId} />
          ) : null
        }
      />
      {templates.length === 0 ? (
        <EmptyState
          icon={IconFile}
          title={t.empty}
          body={t.emptyBody}
          action={<TemplateFormButton organizationId={organizationId} />}
        />
      ) : (
        <TemplatesTable templates={templates} organizationId={organizationId} />
      )}
    </PageContainer>
  );
}
