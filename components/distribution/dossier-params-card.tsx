import { DossierParamsButton } from "@/components/distribution/dossier-params-button";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { missingParams } from "@/lib/distribution/delivery-file";
import type { DossierParams } from "@/lib/distribution/dossier";
import type { SheetOption } from "@/lib/distribution/sources";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";

const t = fr.distribution.dossier;

/**
 * The distribution's own parameters: what is still to say, and « Modifier »
 * for the owner. Their values read in the dossier below, tagged
 * « Distribution », so they are shown once.
 */
export function DossierParamsCard({
  projectId,
  params,
  sheets,
  coverGuessed,
  canEdit,
}: {
  projectId: string;
  params: DossierParams;
  sheets: SheetOption[];
  coverGuessed: boolean;
  canEdit: boolean;
}) {
  const missing = missingParams(params);
  return (
    <PageSection
      id="dossier-params"
      title={t.params.title}
      description={t.params.description}
      card
      action={
        canEdit ? (
          <DossierParamsButton
            projectId={projectId}
            params={params}
            sheets={sheets.map((sheet) => ({
              id: sheet.id,
              label: `${sheet.title} · ${fr.distribution.readiness.sheetStatus[sheet.status]}`,
            }))}
          />
        ) : undefined
      }
    >
      <div className="grid gap-3">
        {missing.length > 0 && (
          <ToneCallout tone="warning">
            {t.params.missing(missing.join(", "))}
          </ToneCallout>
        )}
        {coverGuessed && (
          <ToneCallout tone="info">{t.params.coverGuessed}</ToneCallout>
        )}
        <p className="text-sm text-muted-foreground">
          {params.updatedAt
            ? t.params.updated(formatShortDate(params.updatedAt))
            : t.params.empty}
        </p>
      </div>
    </PageSection>
  );
}
