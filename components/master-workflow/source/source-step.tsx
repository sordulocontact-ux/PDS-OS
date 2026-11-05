import { IconDisc } from "@/components/icons";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { ToneCallout } from "@/components/ui/tone-callout";
import { catalog } from "@/lib/i18n/fr/catalog";
import { masterSource } from "@/lib/i18n/fr/master-source";
import type {
  SourceStepView,
  SourceTitle,
} from "@/lib/master-workflow/source-step";
import { masterStepHref } from "@/lib/ui/master-steps";
import { formatShortDay } from "@/lib/utils/day";

import { MissingStemsRow } from "@/components/master-workflow/round/stems-row";

import { ReplaceSourceButton } from "./newer-source";
import { SourceAudioFile } from "./source-audio";
import { SourceChooser } from "./source-chooser";
import { SourceImport } from "./source-import";

const fr = { catalog, masterSource };

const t = fr.masterSource;

const sectionTitle =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

/**
 * The Source step's content (proto `master-v2.html`): one title at a time
 * (pills when the project has several), what PDS OS checked, the source in
 * force, the final vocals awaited or arrived, and the owner's gesture.
 */
export function SourceStep({
  view,
  titleId,
  ownerName,
}: {
  view: SourceStepView;
  titleId: string | null;
  ownerName: string | null;
}) {
  if (view.titles.length === 0)
    return <ToneCallout tone="info">{t.noTitle}</ToneCallout>;
  const title =
    view.titles.find((x) => x.id === titleId) ??
    view.titles.find((x) => !x.current && !x.declared) ??
    view.titles.find((x) => x.awaited) ??
    view.titles[0];
  const base = masterStepHref(view.projectId, "source");
  return (
    <div className="flex flex-col gap-5">
      {view.titles.length > 1 && (
        <nav aria-label={t.titles} className="flex flex-wrap gap-2">
          {view.titles.map((x) => (
            <FilterChipLink
              key={x.id}
              href={`${base}?titre=${x.id}`}
              current={x.id === title.id}
            >
              {x.title}
            </FilterChipLink>
          ))}
        </nav>
      )}
      <TitleSource view={view} title={title} ownerName={ownerName} />
    </div>
  );
}

function TitleSource({
  view,
  title,
  ownerName,
}: {
  view: SourceStepView;
  title: SourceTitle;
  ownerName: string | null;
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
  // Before the first confirmation, the checks sit inside the form, between
  // the versions and the question on the vocals (proto).
  const inForm = view.canConfirm && !current && title.candidates.length > 0;
  const checked = (
    <section className="flex flex-col gap-2.5">
      <h3 className={sectionTitle}>{t.checked}</h3>
      <FactRows>
        <FactRow
          label={t.mix.label}
          value={
            title.mix === "todo" && title.existingMix
              ? t.mix.value.found(title.existingMix.fileName)
              : t.mix.value[title.mix]
          }
          source={t.mix.source}
          state={{
            tone: title.mix === "done" ? "success" : "neutral",
            label: t.mix.state[title.mix],
          }}
        />
        {title.stems.count > 0 ? (
          <FactRow
            label={t.stems.label}
            value={t.stems.value(title.stems.count, title.stems.latest)}
            source={t.stems.source}
            state={{ tone: "success", label: t.stems.ready }}
          />
        ) : (
          // Missing: the row adds them (Ibé's feedback of 02/11).
          <MissingStemsRow
            organizationId={view.organizationId}
            masterId={title.id}
            title={title.title}
            value={t.stems.value(0, null)}
            source={t.stems.source}
            missingLabel={t.stems.missing}
          />
        )}
        {current && current.vocalsFinal !== null && (
          <FactRow
            label={t.vocals.label}
            value={
              current.vocalsFinal
                ? t.vocals.yes
                : t.vocals.no(current.vocalsPending)
            }
            source={t.vocals.source(
              current.confirmedBy,
              formatShortDay(current.confirmedAt),
            )}
            state={
              current.vocalsFinal
                ? { tone: "success", label: t.vocals.ready }
                : { tone: "warning", label: t.vocals.notYet }
            }
          />
        )}
      </FactRows>
    </section>
  );
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
            <div className="p-3.5 empty:hidden">
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
          <div className="p-3.5 empty:hidden">
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

      {!inForm && checked}

      {view.canConfirm ? (
        <>
          {title.candidates.length === 0 && !title.existingMix && (
            <ToneCallout tone="warning">{t.noAudio}</ToneCallout>
          )}
          <SourceChooser
            projectId={view.projectId}
            title={title}
            mixV1Due={view.mixV1Due}
            checked={inForm ? checked : null}
            imports={
              <SourceImport
                organizationId={view.organizationId}
                masterId={title.id}
              />
            }
          />
        </>
      ) : (
        !current &&
        ownerName && (
          <ToneCallout tone="info">{t.waitingOwner(ownerName)}</ToneCallout>
        )
      )}
    </>
  );
}
