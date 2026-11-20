import { TemplateSourceLink } from "@/components/contracts/templates/template-source-link";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  templatePdfHref,
  templatePreviewHref,
} from "@/lib/contracts/template-links";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { TemplateSeries } from "@/lib/legal/contracts/templates";
import { templateStatusTone } from "@/lib/ui/state-tones";
import { formatInstant } from "@/lib/utils/instant";

const fr = { contracts, legalContracts };

/** What a template is, in a few words: its type and its language. */
export const templateKind = (
  template: Pick<TemplateSeries, "type" | "language">,
) =>
  `${fr.contracts.types[template.type]} · ${fr.legalContracts.languages[template.language]}`;

/**
 * A template as the one who validates it reads it (Ibé, 18/11/2026:
 * « recevoir le modèle en PDF, pas un truc avec les écritures ») : the
 * document itself, each value it fills shown as a blank labeled with what
 * goes there, « Voir le PDF » and, for whoever writes templates, « Modifier »
 * which opens the source document: a template is changed there, then
 * imported again as a new version, never edited in PDS OS. Then who
 * validated it, and its versions.
 */
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
      <DocumentCard
        name={t.document.name(template.name, t.version(template.version))}
        line={templateKind(template)}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={templatePdfHref(template.id)}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              {t.document.pdf}
            </Button>
            {template.source && template.can.newVersion && (
              <TemplateSourceLink
                templateId={template.id}
                name={template.source.name}
                label={t.document.edit}
              />
            )}
          </div>
        }
      >
        <iframe
          title={t.document.frameTitle(template.name)}
          src={templatePreviewHref(template.id)}
          sandbox=""
          className="block h-[70vh] w-full bg-muted"
        />
      </DocumentCard>
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
