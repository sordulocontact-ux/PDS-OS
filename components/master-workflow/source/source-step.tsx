import { IconDisc } from "@/components/icons";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { catalog } from "@/lib/i18n/fr/catalog";
import { masterSource } from "@/lib/i18n/fr/master-source";
import type {
  SourceStepView,
  SourceTitle,
} from "@/lib/master-workflow/source-step";
import { formatShortDay } from "@/lib/utils/day";

import { ReplaceSourceButton } from "./newer-source";
import { SourceAudioFile } from "./source-audio";
import { SourceChooser } from "./source-chooser";
import { SourceImport } from "./source-import";
import {
  pickSourceTitle,
  sourceGestureFirst,
  SourceTitlePills,
} from "./source-lead";

const fr = { catalog, masterSource };

const t = fr.masterSource;

/**
 * The Source step's content (proto `master-v2.html`): one title at a time
 * (pills when the project has several), the source in force, the final vocals awaited or arrived. The owner's gesture on a title
 * still to confirm heads the step instead (SourceLead, the page's `lead`).
 */
export function SourceStep({
  view,
  titleId,
}: {
  view: SourceStepView;
  titleId: string | null;
}) {
  const title = pickSourceTitle(view, titleId);
  if (!title) return <ToneCallout tone="info">{t.noTitle}</ToneCallout>;
  if (sourceGestureFirst(view, title)) return null;
  return (
    <div className="flex flex-col gap-5">
      <SourceTitlePills view={view} title={title} />
      <TitleSource view={view} title={title} />
    </div>
  );
}

function TitleSource({
  view,
  title,
}: {
  view: SourceStepView;
  title: SourceTitle;
}) {
  if (title.declared)
    return (
      <ToneCallout tone="success">
        {t.existing.declared(
          title.declared.fileName,
          title.declared.by,
          formatShortDay(title.declared.at),
          title.declared.reason,
        )}
      </ToneCallout>
    );
  const current = title.current;
  const working = current?.vocalsFinal === false;
  return (
    <>
      {title.newer && (
        <section className="flex flex-col gap-3">
          <ToneCallout tone="success">
            <b className="font-semibold">{t.newer.title}</b>{" "}
            {title.newer.fileName} (
            {t.versionMeta(
              title.candidates.length,
              fr.catalog.audioStates[title.newer.audioState],
              title.newer.addedBy,
              formatShortDay(title.newer.createdAt),
              false,
            )}
            )
          </ToneCallout>
          <DocumentCard
            name={t.newer.proposed}
            line={t.stems.value(title.stems.count, title.stems.latest)}
            icon={IconDisc}
          >
            <div className="p-3.5 empty:hidden modern:p-4">
              <SourceAudioFile
                name={title.newer.fileName}
                listenUrl={title.newer.listenUrl}
                downloadUrl={title.newer.downloadUrl}
              />
            </div>
          </DocumentCard>
          {view.engineer && (
            <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {t.newer.engineer(view.engineer)}
            </p>
          )}
          {view.canConfirm && (
            <ReplaceSourceButton
              projectId={view.projectId}
              masterId={title.id}
              fileId={title.newer.id}
              engineer={view.engineer}
            />
          )}
        </section>
      )}
      {title.awaited && !title.newer && current && (
        <ToneCallout tone="warning">
          {t.waiting(title.artists, current.vocalsPending)} {t.watching}
        </ToneCallout>
      )}

      {current && (
        <DocumentCard
          name={t.current.label}
          line={t.current.source(
            current.confirmedBy,
            formatShortDay(current.confirmedAt),
            working,
          )}
          icon={IconDisc}
        >
          <div className="p-3.5 empty:hidden modern:p-4">
            <SourceAudioFile
              name={current.fileName}
              listenUrl={current.version?.listenUrl ?? null}
              downloadUrl={current.version?.downloadUrl ?? null}
            />
          </div>
          {current.plan && (
            <FactRows className="rounded-none border-0 border-t">
              <FactRow
                label={t.plan.chosen}
                value={
                  current.plan === "wait" ? t.plan.wait : t.plan.anticipate
                }
                source={t.plan.decidedBy(current.confirmedBy)}
              />
            </FactRows>
          )}
        </DocumentCard>
      )}

      {/* Who else waits is said once, by the step (« En attente de … »,
          StepPanel), never again here (Sacha, 27/11/2026). */}
      {view.canConfirm && (
        // A confirmed source: « Changer la source » reopens the form.
        <SourceChooser
          projectId={view.projectId}
          title={title}
          mixV1Due={view.mixV1Due}
          imports={
            <SourceImport
              organizationId={view.organizationId}
              masterId={title.id}
            />
          }
        />
      )}
    </>
  );
}
