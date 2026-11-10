import { notFound } from "next/navigation";

import { PressContentStep } from "@/components/strategy/press-kit/press-content-step";
import { PressLinksStep } from "@/components/strategy/press-kit/press-links-step";
import { DirectionStep } from "@/components/strategy/release-plan/direction-step";
import { GenerateButton } from "@/components/strategy/release-plan/generate-button";
import { GenerateStep } from "@/components/strategy/release-plan/generate-step";
import { GeneratorLocked } from "@/components/strategy/release-plan/generator-locked";
import { GeneratorShell } from "@/components/strategy/release-plan/generator-shell";
import { PagesStep } from "@/components/strategy/release-plan/pages-step";
import { PlanIntro } from "@/components/strategy/release-plan/plan-intro";
import { PreviewStep } from "@/components/strategy/release-plan/preview-step";
import { StrategyStepFrame } from "@/components/strategy/journey/strategy-step-frame";
import { VisualsStep } from "@/components/strategy/release-plan/visuals-step";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { projectKindLabel } from "@/lib/projects/labels";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { emptyPressPages } from "@/lib/strategy/documents/press-kit-build";
import {
  pressKnownItems,
  textsOf,
} from "@/lib/strategy/documents/press-kit-input";
import { orderedPressPages } from "@/lib/strategy/documents/press-kit-model";
import {
  loadPressKitConfig,
  pressKitInput,
  pressKitVersions,
  releasePlanDirection,
} from "@/lib/strategy/documents/press-kit-sources";
import { loadStrategyDocuments } from "@/lib/strategy/documents/queries";
import {
  releasePlanLock,
  stepOf,
  visualCandidates,
} from "@/lib/strategy/documents/release-plan-sources";
import { loadStrategy } from "@/lib/strategy/queries";
import { allInOrder } from "@/lib/utils/parallel";

/**
 * The Dossier de presse generator (ticket Stratégie § 12): the same eight
 * screens as the Plan de sortie, one at a time (?step=n), its own contents
 * (texts for the media, listening links, press contacts). PO starts from the
 * validated Brief, the artist sheet, the project and the selected visuals,
 * and asks only for what is missing. Readers see the generated versions.
 */
export default async function PressKitPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy/press-kit">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadStrategy(projectId, access);
  if (!data) notFound();
  const docs = await loadStrategyDocuments(projectId, data.members);
  const t = fr.strategyPressKit;
  // The same rule as the Plan de sortie: from a validated Brief, never while
  // one is pending (create_strategy_document checks it too).
  const lock = releasePlanLock(docs);
  const owner = canEditProject(access, project);
  const versions = pressKitVersions(docs);
  // Under « Stratégie validée », in the step's frame (the journey keeps
  // that step open, the panel is named after the document).
  const frame = (children: React.ReactNode) => (
    <StrategyStepFrame
      projectId={projectId}
      stepKey="validated"
      page={{ title: t.title, why: t.audience }}
    >
      {children}
    </StrategyStepFrame>
  );
  if (lock && versions.length === 0)
    return frame(
      <GeneratorLocked title={t.locked.title} reason={t.locked[lock]} />,
    );
  const canEdit = owner && !lock;

  const config = await loadPressKitConfig(projectId);
  const step = canEdit ? stepOf(sp.step) : 8;
  const href = (n: number) => routes.projectStrategyPressKit(projectId, n);
  const kind = projectKindLabel({
    type: project.type,
    musicFormat: project.musicFormat,
    contentFormatName: project.contentFormat?.name ?? null,
  });
  const input = await pressKitInput(project, kind, data);
  const hasVersion = versions.length > 0;
  const done = [
    true,
    Boolean(config.textsConfirmed),
    Boolean(config.linksConfirmed),
    Boolean(config.visualsConfirmed),
    Boolean(config.direction?.accepted),
    Boolean(config.pagesConfirmed),
    hasVersion,
    hasVersion,
  ];
  const generate = canEdit ? (
    <GenerateButton
      projectId={projectId}
      kind="press_kit"
      again={hasVersion}
      previewHref={href(8)}
    />
  ) : null;

  const screen = await (async () => {
    switch (step) {
      case 1:
        return (
          <PlanIntro
            title={t.intro.title}
            body={t.intro.body}
            known={pressKnownItems(input)}
            toComplete={(
              ["content", "links", "visuals", "direction", "pages"] as const
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
          <PressContentStep
            projectId={projectId}
            initial={textsOf(input, config)}
            bioSource={input.artist?.bio?.source ?? null}
            nextHref={href(3)}
            canEdit={canEdit}
          />
        );
      case 3:
        return (
          <PressLinksStep
            projectId={projectId}
            initialLinks={config.links ?? input.knownLinks}
            initialContacts={config.contacts ?? input.defaultContacts}
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
            kind="press_kit"
            organizationId={access.organizationId ?? ""}
            candidates={candidates}
            initialSelected={[...selected]}
            nextHref={href(5)}
            canEdit={canEdit}
          />
        ) : (
          <DirectionStep
            projectId={projectId}
            kind="press_kit"
            imageUrls={candidates
              .filter((c) => selected.has(c.key))
              .map((c) => c.previewUrl)}
            // The Plan de sortie's direction, until the dossier has its own.
            saved={config.direction ?? (await releasePlanDirection(projectId))}
            nextHref={href(6)}
            canEdit={canEdit}
          />
        );
      }
      case 6:
        return (
          <PagesStep
            projectId={projectId}
            kind="press_kit"
            initial={orderedPressPages(config.pages)}
            empty={emptyPressPages(input, config, config.selected?.length ?? 0)}
            names={t.pages.names}
            nextHref={href(7)}
            canEdit={canEdit}
          />
        );
      case 7:
        return (
          <GenerateStep
            kind="press_kit"
            complete={done.slice(1, 6).every(Boolean)}
          >
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
            kind="press_kit"
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

  return frame(
    <div className="flex flex-col gap-5">
      {lock && <ToneCallout tone="warning">{t.locked[lock]}</ToneCallout>}
      {owner ? (
        <GeneratorShell
          label={t.stepsLabel}
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
    </div>,
  );
}
