import { notFound } from "next/navigation";

import { TemplateRowActions } from "@/components/contracts/templates/template-row-actions";
import { TemplateView } from "@/components/contracts/templates/template-view";
import { TemplateValidateButton } from "@/components/contracts/templates/template-validate-button";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listTemplateSeries } from "@/lib/legal/contracts/templates";
import { templateStatusTone } from "@/lib/ui/state-tones";

export const metadata = {
  title: `${fr.legalContracts.templates.title} · ${fr.app.name}`,
};

/**
 * One contract template, its own page (JUR-19): its text, the values it
 * injects, its source file and versions, who validated it and when; the
 * director validates a draft here. Reserved to manage_legal, like the
 * library.
 */
export default async function ContractTemplatePage({
  params,
}: PageProps<"/app/contracts/templates/[seriesId]">) {
  const access = await requireApproved();
  if (!can(access, "manage_legal") || !access.organizationId) notFound();
  const { seriesId } = await params;
  const template = (await listTemplateSeries(access)).find(
    (s) => s.seriesId === seriesId,
  );
  if (!template) notFound();
  const t = fr.legalContracts.templates;

  return (
    <PageContainer>
      <BackLink href={routes.contractTemplates}>{t.backToLibrary}</BackLink>
      <PageHeader
        title={`${template.name} · ${t.version(template.version)}`}
        description={[fr.contracts.types[template.type], template.usage]
          .filter(Boolean)
          .join(" · ")}
        badge={
          <StatusBadge tone={templateStatusTone[template.status]}>
            {t.states[template.status]}
          </StatusBadge>
        }
        action={
          <div className="flex items-center gap-2">
            {template.can.validate && (
              <TemplateValidateButton templateId={template.id} />
            )}
            <TemplateRowActions
              template={template}
              organizationId={access.organizationId}
              size="icon-lg"
            />
          </div>
        }
      />
      {template.status === "draft" && !template.can.validate && (
        <ToneCallout tone="info">{t.whoValidates}</ToneCallout>
      )}
      <TemplateView template={template} />
    </PageContainer>
  );
}
