import { BriefDialog } from "@/components/production/prep/brief-dialog";
import { BriefReading } from "@/components/production/prep/brief-reading";
import { DirectorDialog } from "@/components/production/prep/director-dialog";
import { PageSection } from "@/components/shell/page-section";
import type { Member } from "@/lib/framing/related";
import { productionBrief } from "@/lib/i18n/fr/production-brief";
import type {
  NetworkOption,
  ProductionSheetData,
} from "@/lib/production/sheet";
import { formatDate } from "@/lib/release/format";

const fr = { productionBrief };

const t = fr.productionBrief;

/**
 * « Brief réalisateur » (ticket, parcours 2): the designated director (or
 * who designates one), then the approach to the shoot that completes the
 * validated creative direction. The owner designates; the owner or a
 * designated member writes. Nothing is filled in for them.
 */
export function ProductionBriefSection({
  projectId,
  sheet,
  canWriteBrief,
  canOrganize,
  members,
  contacts,
}: {
  projectId: string;
  sheet: NonNullable<ProductionSheetData["sheet"]>;
  canWriteBrief: boolean;
  canOrganize: boolean;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const { director } = sheet;
  return (
    <PageSection
      id="production-brief"
      title={t.title}
      description={t.description}
      card
      action={
        canWriteBrief ? (
          <BriefDialog
            projectId={projectId}
            sheetId={sheet.id}
            brief={sheet.brief}
            started={sheet.briefUpdatedAt !== null}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">
              {t.director.label}
            </span>
            {director ? (
              <span>
                <span className="font-semibold">{director.name}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {director.kind === "person"
                    ? t.director.member
                    : t.director.network}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">{t.director.none}</span>
            )}
          </p>
          {canOrganize && (
            <DirectorDialog
              projectId={projectId}
              sheetId={sheet.id}
              director={director}
              members={members}
              contacts={contacts}
            />
          )}
        </div>

        <BriefReading brief={sheet.brief} />

        {sheet.briefUpdatedAt && (
          <p className="text-xs text-muted-foreground">
            {t.updated(sheet.briefUpdatedBy, formatDate(sheet.briefUpdatedAt))}
          </p>
        )}
      </div>
    </PageSection>
  );
}
