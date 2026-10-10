import { notFound } from "next/navigation";

import { DirectionStep } from "@/components/strategy/release-plan/direction-step";
import { FormatsStep } from "@/components/strategy/release-plan/formats-step";
import { GenerateButton } from "@/components/strategy/release-plan/generate-button";
import { GenerateStep } from "@/components/strategy/release-plan/generate-step";
import { GeneratorLocked } from "@/components/strategy/release-plan/generator-locked";
import { GeneratorShell } from "@/components/strategy/release-plan/generator-shell";
import { PagesStep } from "@/components/strategy/release-plan/pages-step";
import { PhasesStep } from "@/components/strategy/release-plan/phases-step";
import { PlanIntro } from "@/components/strategy/release-plan/plan-intro";
import { PreviewStep } from "@/components/strategy/release-plan/preview-step";
import { VisualsStep } from "@/components/strategy/release-plan/visuals-step";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { projectKindLabel } from "@/lib/projects/labels";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { offsetsOf, proposePhases } from "@/lib/strategy/documents/phases";
import {
  emptyPages,
  knownItems,
  stepsDone,
} from "@/lib/strategy/documents/plan-steps";
import { loadStrategyDocuments } from "@/lib/strategy/documents/queries";
import { releasePlanInput } from "@/lib/strategy/documents/release-plan-input";
import { orderedPages } from "@/lib/strategy/documents/release-plan-model";
import {
  loadReleasePlanConfig,
  releasePlanLock,
  releasePlanVersions,
  stepOf,
  visualCandidates,
} from "@/lib/strategy/documents/release-plan-sources";
import { loadStrategy } from "@/lib/strategy/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.strategyReleasePlan.title} · ${fr.app.name}`,
};

/**
 * The Plan de sortie generator (ticket Stratégie § 11): eight steps, one at
 * a time (?step=n). PO starts from the validated strategy and asks only for
 * what is missing; the server builds the document, never a blind export of
 * the Brief. Readers see the generated versions only.
 */
export default async function ReleasePlanPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy/release-plan">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadStrategy(projectId, access);
  if (!data) notFound();
  const docs = await loadStrategyDocuments(projectId, data.members);
  const t = fr.strategyReleasePlan;
  const lock = releasePlanLock(docs);
  const owner = canEditProject(access, project);
  const versions = releasePlanVersions(docs);
  if (lock && versions.length === 0)
    return (
      <div className="pt-6">
        <GeneratorLocked projectId={projectId} reason={t.locked[lock]} />
      </div>
    );
  const canEdit = owner && !lock;

  const config = await loadReleasePlanConfig(projectId);
  const step = canEdit ? stepOf(sp.step) : 8;
  const href = (n: number) => routes.projectStrategyReleasePlan(projectId, n);
  const kind = projectKindLabel({
    type: project.type,
    musicFormat: project.musicFormat,
    contentFormatName: project.contentFormat?.name ?? null,
  });
  const input = releasePlanInput(project, kind, data, project.ownerName ?? "");
  const done = stepsDone(config, versions.length > 0);
  const generate = canEdit ? (
    <GenerateButton
      projectId={projectId}
      again={versions.length > 0}
      previewHref={href(8)}
    />
  ) : null;

  const screen = await (async () => {
    switch (step) {
      case 1:
        return (
          <PlanIntro
            known={knownItems(input, data.objectives.length)}
            toComplete={(
              ["phases", "formats", "visuals", "direction", "pages"] as const
            ).map((key, i) => ({
              key,
              label: t.intro.toCompleteItems[key],
              done: done[i + 1],
              href: href(i + 2),
            }))}
            startHref={href(2)}
            canEdit={canEdit}
          />
        );
      case 2:
        return (
          <PhasesStep
            projectId={projectId}
            initial={
              config.phases ??
              proposePhases(data.milestones, data.referenceDate)
            }
            offsets={offsetsOf(data.milestones, data.referenceDate)}
            nextHref={href(3)}
            canEdit={canEdit}
          />
        );
      case 3:
        return (
          <FormatsStep
            projectId={projectId}
            initial={config.formats ?? input.formats}
            nextHref={href(4)}
            canEdit={canEdit}
          />
        );
      case 4:
      case 5: {
        const candidates = await visualCandidates(projectId, config);
        const selected = new Set(config.selected ?? []);
        return step === 4 ? (
          <VisualsStep
            projectId={projectId}
            organizationId={access.organizationId ?? ""}
            candidates={candidates}
            initialSelected={[...selected]}
            nextHref={href(5)}
            canEdit={canEdit}
          />
        ) : (
          <DirectionStep
            projectId={projectId}
            imageUrls={candidates
              .filter((c) => selected.has(c.key))
              .map((c) => c.previewUrl)}
            saved={config.direction}
            nextHref={href(6)}
            canEdit={canEdit}
          />
        );
      }
      case 6:
        return (
          <PagesStep
            projectId={projectId}
            initial={orderedPages(config.pages)}
            empty={emptyPages(input, config, config.selected?.length ?? 0)}
            names={t.pages.names}
            nextHref={href(7)}
            canEdit={canEdit}
          />
        );
      case 7:
        return (
          <GenerateStep complete={done.slice(1, 6).every(Boolean)}>
            {generate}
          </GenerateStep>
        );
      default: {
        const asked = Number.parseInt(String(sp.v ?? ""), 10);
        const current =
          versions.find((v) => v.version === asked) ?? versions[0] ?? null;
        return (
          <PreviewStep
            projectId={projectId}
            versions={versions}
            current={current}
            canEdit={canEdit}
            meId={access.personId}
            directorName={data.validators[0]?.name ?? null}
            creatives={docs.creatives}
            generate={generate}
          />
        );
      }
    }
  })();

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-display-md font-semibold">{t.title}</h1>
        <p className="text-body-md text-muted-foreground">{t.audience}</p>
      </div>
      {lock && <ToneCallout tone="warning">{t.locked[lock]}</ToneCallout>}
      {owner ? (
        <GeneratorShell
          steps={t.steps.map((name, i) => ({
            name,
            href: href(i + 1),
            done: done[i],
          }))}
          current={step}
        >
          {screen}
        </GeneratorShell>
      ) : (
        <>
          <ToneCallout tone="neutral">{t.locked.readOnly}</ToneCallout>
          {screen}
        </>
      )}
    </div>
  );
}
