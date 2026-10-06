import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { TemplateSeries } from "@/lib/legal/contracts/templates";
import { formatDate } from "@/lib/release/format";
import { templateStatusTone } from "@/lib/ui/state-tones";

/** A template as it stands: its text, the values it injects, its versions. */
export function TemplateView({ template }: { template: TemplateSeries }) {
  const t = fr.legalContracts.templates;
  return (
    <div className="flex flex-col gap-5">
      {template.validatedBy && template.validatedAt && (
        <p className="text-sm text-muted-foreground">
          {t.validatedBy(
            template.validatedBy,
            formatDate(template.validatedAt),
          )}
        </p>
      )}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.usesFields}</h3>
        <p className="text-sm text-muted-foreground">
          {template.fields
            .map((id) => fr.legalContracts.fields[id] ?? id)
            .join(", ") || "—"}
        </p>
      </section>
      <div className="max-h-96 overflow-y-auto overscroll-contain rounded-xl border bg-background p-4 text-sm break-words whitespace-pre-wrap">
        {template.body}
      </div>
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
