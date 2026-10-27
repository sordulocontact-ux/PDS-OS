import { ProjectFresh } from "@/components/projects/project-fresh";
import { PickBar } from "@/components/ui/pick-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/auth/redirects";
import { productionJourney } from "@/lib/i18n/fr/production-journey";
import { productionLight } from "@/lib/i18n/fr/production-light";
import { loadProjectJourneys } from "@/lib/journey/project";
import { productionDeliverables } from "@/lib/journey/production";

const fr = { productionJourney, productionLight };

const t = fr.productionJourney;

async function LoadedDeliverableBar({
  projectId,
  current,
}: {
  projectId: string;
  current: string;
}) {
  const [list, journeys] = await Promise.all([
    productionDeliverables(projectId),
    loadProjectJourneys(projectId),
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
        sub: [
          d.derived
            ? fr.productionLight.derived
            : d.kind
              ? [t.header.organization[d.kind], d.company]
                  .filter(Boolean)
                  .join(" · ")
              : t.bar.toChoose,
          d.closed ? t.bar.delivered : null,
        ]
          .filter(Boolean)
          .join(" · "),
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
