import { MissingStemsRow } from "@/components/master-workflow/round/stems-row";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import type { StepView } from "@/lib/master-workflow/transmission";
import { formatDay } from "@/lib/utils/day";

const fr = { masterRound, masterWorkflow };

const t = fr.masterRound;

/**
 * The package exactly as the engineer will get it, before it leaves (proto
 * « Dossier pour le mixeur », a document card): each title with its source
 * and its stems, then what the Brief asks, one fact per line with where it
 * comes from. A title without stems: its row adds them (MissingStemsRow).
 * The rates never appear: they stay internal.
 */
export function PackagePreview({ view }: { view: StepView }) {
  const d = t.dossier;
  const role = view.role;
  const brief = view.brief;
  const groups = brief
    ? (["direction", "references", "constraints"] as const).flatMap((key) =>
        brief[key] ? [{ key, text: brief[key] }] : [],
      )
    : [];
  const dates = brief
    ? (role === "mix"
        ? ([
            "mixV1Due",
            "mixFinalDue",
            "masteringDue",
            "masterFinalDue",
          ] as const)
        : (["masteringDue", "masterFinalDue"] as const)
      ).flatMap((key) =>
        brief.dates[key]
          ? [
              `${fr.masterWorkflow.mix.package[key]} ${formatDay(brief.dates[key])}`,
            ]
          : [],
      )
    : [];
  if (role === "mix" && view.releaseDue)
    dates.push(d.release(formatDay(view.releaseDue)));

  return (
    <DocumentCard
      name={t.package.title[role]}
      line={view.engineer ? d.line(view.engineer.name) : d.lineNoEngineer}
    >
      <FactRows>
        {view.titles.map((title) => (
          <TitleRows key={title.id} title={title} view={view} />
        ))}
        {role === "mix" && (
          <FactRow
            label={d.direction}
            value={
              groups.length ? (
                <span className="flex flex-col gap-1">
                  {groups.map((g) => (
                    <span key={g.key} className="flex flex-col">
                      <span className="text-caption text-muted-foreground">
                        {d.directionGroups[g.key]}
                      </span>
                      <span className="whitespace-pre-line">{g.text}</span>
                    </span>
                  ))}
                </span>
              ) : null
            }
            missing={groups.length === 0}
            source={groups.length ? d.from.brief : null}
          />
        )}
        {role === "mix" && brief && brief.deliverables.length > 0 && (
          <FactRow
            label={d.deliverables}
            value={brief.deliverables
              .map((key) => fr.masterWorkflow.brief.deliverables[key])
              .join(", ")}
            source={d.from.brief}
          />
        )}
        {brief?.formats && (
          <FactRow
            label={d.formats}
            value={brief.formats}
            source={d.from.brief}
          />
        )}
        {dates.length > 0 && (
          <FactRow
            label={d.dates}
            value={
              <span className="flex flex-col">
                {dates.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            }
            source={d.from.brief}
          />
        )}
        {role === "mix" && brief?.revisions != null && (
          <FactRow
            label={d.revisions}
            value={String(brief.revisions)}
            source={d.from.brief}
          />
        )}
        {brief?.message && (
          <FactRow
            label={d.message[role]}
            value={<span className="whitespace-pre-line">{brief.message}</span>}
            source={d.from.brief}
          />
        )}
      </FactRows>
    </DocumentCard>
  );
}

function TitleRows({
  title,
  view,
}: {
  title: StepView["titles"][number];
  view: StepView;
}) {
  const d = t.dossier;
  const role = view.role;
  return (
    <>
      {role === "mix" && (
        <FactRow
          label={d.title.mix}
          value={d.titleValue(title.title, title.artists)}
          source={d.from.catalog}
        />
      )}
      <FactRow
        label={d.source[role]}
        value={
          title.source
            ? role === "mastering"
              ? d.titleValue(title.title, title.source.fileName)
              : title.source.fileName
            : null
        }
        missing={!title.source}
        missingLabel={d.sourceMissing[role]}
        source={
          title.source
            ? role === "mix"
              ? d.from.source
              : d.from.mixFinal
            : null
        }
      />
      {role === "mix" &&
        (title.stems > 0 ? (
          <FactRow
            label={d.stems}
            value={t.before.stemsCount(title.stems)}
            source={d.from.stems}
          />
        ) : (
          <MissingStemsRow
            organizationId={view.organizationId}
            masterId={title.id}
            title={title.title}
          />
        ))}
    </>
  );
}
