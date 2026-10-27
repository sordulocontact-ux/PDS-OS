import { TemplateBody } from "@/components/contracts/templates/field-chip";
import { TemplateSourceLink } from "@/components/contracts/templates/template-source-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { TemplateSeries } from "@/lib/legal/contracts/templates";
import { templateStatusTone } from "@/lib/ui/state-tones";
import { formatInstant } from "@/lib/utils/instant";

const fr = { legalContracts };

/** A template as it stands: its text, the values it injects, its versions. */
export function TemplateView({ template }: { template: TemplateSeries }) {
  const t = fr.legalContracts.templates;
  return (
    <div className="flex flex-col gap-5">
      {template.validatedBy && template.validatedAt && (
        <p className="text-sm text-muted-foreground">
          {t.validatedBy(
            template.validatedBy,
            formatInstant(template.validatedAt),
          )}
        </p>
      )}
      {template.status === "retired" && template.retiredReason && (
        <p className="text-sm text-muted-foreground">
          {t.retiredBecause(template.retiredReason)}
        </p>
      )}
      {template.source && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t.source.title}</h3>
          <TemplateSourceLink
            templateId={template.id}
            name={template.source.name}
          />
        </section>
      )}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.usesFields}</h3>
        <p className="text-sm text-muted-foreground">
          {template.fields
            .map((id) => fr.legalContracts.fields[id] ?? id)
            .join(", ") || "—"}
        </p>
      </section>
      <TemplateBody body={template.body} />
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.versions}</h3>
        <ul className="flex flex-wrap gap-2">
          {template.versions.map((v) => (
            <li key={v.id} className="flex items-center gap-1.5 text-sm">
              {t.version(v.version)}
              <StatusBadge tone={templateStatusTone[v.status]} size="sm">
                {t.states[v.status]}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
