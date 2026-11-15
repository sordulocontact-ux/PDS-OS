import { ProjectFresh } from "@/components/projects/project-fresh";
import { PickBar } from "@/components/ui/pick-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/auth/redirects";
import { productionJourney } from "@/lib/i18n/fr/production-journey";
import { productionLight } from "@/lib/i18n/fr/production-light";
import { loadProjectJourneys } from "@/lib/journey/project";
import { productionDeliverables } from "@/lib/journey/production";
import { titleScopeLabel } from "@/lib/projects/title-scope-rules";
import { loadTitleScopes, scopeOf } from "@/lib/projects/title-scopes";

const fr = { productionJourney, productionLight };

const t = fr.productionJourney;

type Deliverable = Awaited<ReturnType<typeof productionDeliverables>>[number];

/** A deliverable's line, in the bar and in the trail's switcher: who
 * produces it (« Qui produit ? à choisir » before), « livré » once closed. */
export function deliverableLine(d: Deliverable): string {
  return [
    d.derived
      ? fr.productionLight.derived
      : d.kind
        ? [t.header.organization[d.kind], d.company].filter(Boolean).join(" · ")
        : t.bar.toChoose,
    d.closed ? t.bar.delivered : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

async function LoadedDeliverableBar({
  projectId,
  current,
}: {
  projectId: string;
  current: string;
}) {
  const [list, journeys, scopes] = await Promise.all([
    productionDeliverables(projectId),
    loadProjectJourneys(projectId),
    loadTitleScopes(projectId),
  ]);
  if (list.length === 0) return null;
  const mine = (id: string) =>
    journeys.mine.filter((a) => a.step.href.includes(`/production/${id}/`))
      .length;
  return (
    <PickBar
      label={t.bar.label}
      current={current}
      items={list.map((d) => ({
        key: d.id,
        title: d.title,
        // A collective: the titles it targets too (lot 10).
        sub: scopes
          ? `${deliverableLine(d)} · ${titleScopeLabel(scopeOf(scopes.deliverables, d.id), scopes.titles)}`
          : deliverableLine(d),
        href: routes.projectProductionSheet(projectId, d.id),
        mine: mine(d.id),
      }))}
    />
  );
}

/**
 * The deliverables in Production, apart from the journey (proto
 * `prodPicker`): one card per transferred Fiche — its name with the
 * viewer's actions there, who produces it (« Qui produit ? à choisir »
 * before), « livré » once closed. The viewer's actions come from every
 * journey of the project: the page never waits for them (ProjectFresh).
 */
export function DeliverableBar(props: { projectId: string; current: string }) {
  return (
    <ProjectFresh
      projectId={props.projectId}
      id="deliverable-bar"
      fallback={<Skeleton className="h-16 rounded-2xl" />}
    >
      <LoadedDeliverableBar {...props} />
    </ProjectFresh>
  );
}
