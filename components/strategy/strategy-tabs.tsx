import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/** Pilotage · Brief de sortie · Documents · Suivi of the Strategy. */
export function StrategyTabs({ projectId }: { projectId: string }) {
  const t = fr.strategyFlow.tabs;
  return (
    <SectionTabs
      label={t.label}
      tabs={[
        {
          href: routes.projectStrategy(projectId),
          label: t.pilot,
          exact: true,
        },
        { href: routes.projectStrategyBrief(projectId), label: t.brief },
        {
          href: routes.projectStrategyDocuments(projectId),
          label: t.documents,
        },
        { href: routes.projectStrategyFollowUp(projectId), label: t.followUp },
      ]}
    />
  );
}
