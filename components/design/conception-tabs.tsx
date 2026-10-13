import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * The pages of the Conception, under the Marketing chevrons, in the order
 * of its journey (MKT-C2-03): home (the journey and the dossier's
 * validation), intentions, references, artistic direction and Fiches
 * Livrables (developing), then the Brief créatif (consolidating). Links, so
 * each page is shareable; the home says which one to open next.
 */
export function ConceptionTabs({ projectId }: { projectId: string }) {
  const t = fr.conception.tabs;
  return (
    <SectionTabs
      label={fr.conception.tabsLabel}
      tabs={[
        { href: routes.projectDesign(projectId), label: t.home, exact: true },
        { href: routes.projectDesignWork(projectId), label: t.work },
        {
          href: routes.projectDesignReferences(projectId),
          label: t.references,
        },
        { href: routes.projectDesignDirection(projectId), label: t.direction },
        { href: routes.projectDesignSheets(projectId), label: t.sheets },
        { href: routes.projectDesignBrief(projectId), label: t.brief },
      ]}
    />
  );
}
