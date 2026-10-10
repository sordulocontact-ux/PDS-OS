import { VersionView } from "@/components/strategy/documents/version-view";
import { GenerateButton } from "@/components/strategy/generator/generate-button";
import { GeneratorLocked } from "@/components/strategy/generator/generator-locked";
import { GeneratorShell } from "@/components/strategy/generator/generator-shell";
import { PagesStep } from "@/components/strategy/generator/pages-step";
import { PressContentStep } from "@/components/strategy/generator/press-content-step";
import { VisualsStep } from "@/components/strategy/generator/visuals-step";
import { StrategyTabs } from "@/components/strategy/strategy-tabs";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { pressDefaults } from "@/lib/strategy/documents/build";
import {
  loadPressKitConfig,
  loadReleasePlanConfig,
} from "@/lib/strategy/documents/drafts";
import { generatorLock, stepOf } from "@/lib/strategy/documents/generator-gate";
import {
  DEFAULT_ACCENT,
  orderedPages,
  PRESS_KIT_PAGES,
  type PageKey,
} from "@/lib/strategy/documents/model";
import { pressKitProgress } from "@/lib/strategy/documents/plan-steps";
import { loadDocumentSources } from "@/lib/strategy/documents/sources";
import { loadStrategyPage } from "@/lib/strategy/page-data";
import { versionsOf } from "@/lib/strategy/workspace";

/**
 * The Dossier de presse generator (ticket § 12): PO starts again from the
 * validated Brief, the artist's sheet, the project and the selected visuals;
 * the owner retouches the text, picks the images, orders the pages. For the
 * media: no budget, ever.
 */
export default async function PressKitPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy/press-kit">) {
  const { projectId } = await params;
  const page = await loadStrategyPage(projectId);
  const t = fr.strategyDocs;
  const tabs = <StrategyTabs projectId={projectId} />;
  const lock = generatorLock(page);
  const sources = lock
    ? null
    : await loadDocumentSources(page, { withBio: true });
  if (lock || !sources)
    return (
      <div className="flex flex-col gap-6 pt-6">
        {tabs}
        <GeneratorLocked
          projectId={projectId}
          reason={lock ?? t.generator.needsBrief}
        />
      </div>
    );

  const { data, ctx, access, project } = page;
  const [config, plan] = await Promise.all([
    loadPressKitConfig(projectId),
    loadReleasePlanConfig(projectId),
  ]);
  const versions = versionsOf(ctx.documents, "press_kit");
  const step = stepOf((await searchParams).step, 4);
  const href = (n: number) => routes.projectStrategyPressKit(projectId, n);
  const progress = pressKitProgress(config, versions.length > 0);
  const steps = t.press.steps.map((name, i) => ({
    name,
    href: href(i + 1),
    done: progress[i],
  }));
  const defaults = pressDefaults(sources.brief, {
    bio: sources.artist?.bio ?? null,
    owner: sources.owner,
  });
  const values = {
    artistText: config.artistText ?? defaults.artistText,
    newsText: config.newsText ?? defaults.newsText,
    storyText: config.storyText ?? defaults.storyText,
    contactsText: config.contactsText ?? defaults.contactsText,
    pressInfoText: config.pressInfoText ?? defaults.pressInfoText,
  };
  // The Plan de sortie's direction, when there is one, is offered first.
  const direction = config.direction ??
    plan.direction ?? { theme: "paper" as const, accent: DEFAULT_ACCENT };
  const empty: PageKey[] = [
    ...(sources.links.length ? [] : (["listen"] as const)),
    ...(config.visuals?.length ? [] : (["universe"] as const)),
    ...(
      [
        ["artist", values.artistText],
        ["news", values.newsText],
        ["story", values.storyText],
        ["contacts", values.contactsText],
        ["press_info", values.pressInfoText],
      ] as const
    ).flatMap(([key, value]) => (value.trim() ? [] : [key])),
  ];

  const screen = (() => {
    switch (step) {
      case 1:
        return (
          <PressContentStep
            projectId={projectId}
            values={values}
            nextHref={href(2)}
          />
        );
      case 2:
        return (
          <VisualsStep
            projectId={projectId}
            organizationId={access.organizationId ?? ""}
            kind="press_kit"
            candidates={sources.visuals}
            initial={config.visuals ?? plan.visuals ?? []}
            direction={{ theme: direction.theme, accent: direction.accent }}
            nextHref={href(3)}
          />
        );
      case 3:
        return (
          <div className="flex flex-col gap-6">
            {sources.links.length === 0 && (
              <ToneCallout tone="neutral">{t.press.noLinks}</ToneCallout>
            )}
            <PagesStep
              projectId={projectId}
              kind="press_kit"
              initial={orderedPages(PRESS_KIT_PAGES, config.pages)}
              empty={empty}
              nextHref={href(4)}
            />
          </div>
        );
      default: {
        const generate = (
          <GenerateButton
            projectId={projectId}
            kind="press_kit"
            label={versions.length ? t.plan.regenerate : t.press.generate}
            pendingLabel={t.press.generating}
            variant={versions.length ? "outline" : "default"}
          />
        );
        return versions[0] ? (
          <VersionView
            projectId={projectId}
            projectTitle={project.title}
            version={versions[0]}
            versions={versions}
            meId={access.personId}
            owner
            director={data.validators[0]?.name ?? null}
            creatives={ctx.creatives}
            editHref={href(3)}
            extra={generate}
          />
        ) : (
          <section className="flex flex-col items-start gap-4">
            <p className="max-w-prose text-body-md text-muted-foreground">
              {t.press.introBody}
            </p>
            {generate}
          </section>
        );
      }
    }
  })();

  return (
    <div className="flex flex-col gap-6 pt-6">
      {tabs}
      <GeneratorShell
        label={t.generator.stepsLabel}
        steps={steps}
        current={step}
      >
        {screen}
      </GeneratorShell>
    </div>
  );
}
