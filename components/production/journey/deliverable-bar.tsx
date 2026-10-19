import { PickBar } from "@/components/ui/pick-bar";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { productionDeliverables } from "@/lib/journey/production";
import type { ProjectJourneys } from "@/lib/journey/types";

const t = fr.productionJourney;

/**
 * The deliverables in Production, apart from the journey (proto
 * `prodPicker`): one card per transferred Fiche — its name with the
 * viewer's actions there, who produces it (« Qui produit ? à choisir »
 * before), « livré » once closed.
 */
export async function DeliverableBar({
  projectId,
  current,
  journeys,
}: {
  projectId: string;
  current: string;
  journeys: ProjectJourneys;
}) {
  const list = await productionDeliverables(projectId);
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
          d.kind
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
