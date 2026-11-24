import { notFound } from "next/navigation";

import { TemplateRowActions } from "@/components/contracts/templates/template-row-actions";
import { TemplateView } from "@/components/contracts/templates/template-view";
import { TemplateValidateButton } from "@/components/contracts/templates/template-validate-button";
import { SectionFrame } from "@/components/shell/section-frame";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { findTemplateSeries } from "@/lib/contracts/template-series";
import { templateStatusTone } from "@/lib/ui/state-tones";

export const metadata = {
  title: `${fr.legalContracts.templates.title} · ${fr.app.name}`,
};

/**
 * One contract template, its own page (JUR-19): the template as a document
 * (Ibé, 18/11/2026: the PDF, its values as blanks), « Modifier » opening its
 * source document, its versions, who validated it and when; the business
 * manager (or the direction, who supervises) validates a draft here.
 * Reserved to manage_legal and validate_contracts.
 */
export default async function ContractTemplatePage({
  params,
}: PageProps<"/app/contracts/templates/[seriesId]">) {
  const access = await requireApproved();
  const { seriesId } = await params;
  const template = await findTemplateSeries(seriesId);
  // Never without manage_legal or validate_contracts, and an organization
  // (findTemplateSeries).
  if (!template || !access.organizationId) notFound();
  const t = fr.legalContracts.templates;

  return (
    <SectionFrame
      list={false}
      parent={[
        { label: fr.shell.nav.contracts, href: routes.contracts },
        { label: t.title, href: routes.contractTemplateList },
      ]}
      title={`${template.name} · ${t.version(template.version)}`}
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
    >
      {template.status === "draft" && !template.can.validate && (
        <ToneCallout tone="info">{t.whoValidates}</ToneCallout>
      )}
      <TemplateView template={template} />
    </SectionFrame>
  );
}
