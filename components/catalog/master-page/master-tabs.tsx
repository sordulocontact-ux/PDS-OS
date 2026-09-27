import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Sections of a master. Splits only for those who may read them
// (manage_catalog, as the database decides).
export function MasterTabs({
  masterId,
  canSeeSplits,
}: {
  masterId: string;
  canSeeSplits: boolean;
}) {
  const t = fr.masterPage.tabs;
  return (
    <SectionTabs
      label={fr.masterPage.tabsLabel}
      tabs={[
        { href: routes.master(masterId), label: t.overview, exact: true },
        { href: routes.masterSessions(masterId), label: t.sessions },
        { href: routes.masterVersions(masterId), label: t.versions },
        { href: routes.masterCredits(masterId), label: t.credits },
        ...(canSeeSplits
          ? [{ href: routes.masterSplits(masterId), label: t.splits }]
          : []),
        { href: routes.masterRights(masterId), label: t.rights },
        { href: routes.masterDistribution(masterId), label: t.distribution },
        { href: routes.masterProjects(masterId), label: t.projects },
        { href: routes.masterFiles(masterId), label: t.files },
        { href: routes.masterActivity(masterId), label: t.activity },
      ]}
    />
  );
}
