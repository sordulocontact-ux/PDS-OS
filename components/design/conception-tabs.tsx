import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * The pages of the Conception, under the Marketing chevrons: home,
 * intentions, references, artistic direction, Brief créatif, Fiches
 * Livrables. Links, so each page is shareable; the project's own sections
 * stay in its sidebar (never repeated here).
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
        { href: routes.projectDesignBrief(projectId), label: t.brief },
        { href: routes.projectDesignSheets(projectId), label: t.sheets },
      ]}
    />
  );
}
