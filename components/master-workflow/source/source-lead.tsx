import { SegmentedLinks } from "@/components/ui/segmented-control";
import { masterSource } from "@/lib/i18n/fr/master-source";
import type {
  SourceStepView,
  SourceTitle,
} from "@/lib/master-workflow/source-step";
import { masterStepHref } from "@/lib/ui/master-steps";

import { SourceChecked } from "./source-checked";
import { SourceChooser } from "./source-chooser";
import { SourceImport } from "./source-import";

const fr = { masterSource };

const t = fr.masterSource;

/** The title the step shows: the one in the URL, else the first still to
 * confirm, else the first whose vocals are awaited, else the first. */
export function pickSourceTitle(
  view: SourceStepView,
  titleId: string | null,
): SourceTitle | null {
  return (
    view.titles.find((x) => x.id === titleId) ??
    view.titles.find((x) => !x.current && !x.declared) ??
    view.titles.find((x) => x.awaited) ??
    view.titles[0] ??
    null
  );
}

/** The owner has the title's source to give: their gesture heads the step
 * (StepPanel `lead`, Akili's feedback of 02/11/2026). */
export function sourceGestureFirst(
  view: SourceStepView,
  title: SourceTitle | null,
): title is SourceTitle {
  return Boolean(view.canConfirm && title && !title.current && !title.declared);
}

/** The project's titles as pills, when it has several. */
export function SourceTitlePills({
  view,
  title,
}: {
  view: SourceStepView;
  title: SourceTitle;
}) {
  if (view.titles.length < 2) return null;
  const base = masterStepHref(view.projectId, "source");
  return (
    <SegmentedLinks
      label={t.titles}
      className="self-start"
      options={view.titles.map((x) => ({
        key: x.id,
        href: `${base}?titre=${x.id}`,
        current: x.id === title.id,
        label: x.title,
      }))}
    />
  );
}

/**
 * The owner's gesture on a title not confirmed yet, at the head of the
 * step: nothing at the Catalogue → one sentence and « Importer une
 * version »; else the form, its checks between the versions and the
 * question on the vocals (proto).
 */
export function SourceLead({
  view,
  title,
}: {
  view: SourceStepView;
  title: SourceTitle;
}) {
  const empty = title.candidates.length === 0 && !title.existingMix;
  return (
    <div className="flex flex-col gap-4">
      <SourceTitlePills view={view} title={title} />
      {empty ? (
        <SourceImport
          organizationId={view.organizationId}
          masterId={title.id}
          first
        />
      ) : (
        <SourceChooser
          projectId={view.projectId}
          title={title}
          mixV1Due={view.mixV1Due}
          checked={
            title.candidates.length > 0 ? (
              <SourceChecked view={view} title={title} />
            ) : null
          }
          imports={
            <SourceImport
              organizationId={view.organizationId}
              masterId={title.id}
            />
          }
        />
      )}
    </div>
  );
}
