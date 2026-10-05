import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Sections of a title ("master" in the code), in six tabs (docs/DESIGN.md
// § 4): related sections are blocks of one page, not tabs of their own
// (sessions in Audio, splits in Crédits, distribution in Projets & sorties,
// variants and activity in the overview).
export function MasterTabs({ masterId }: { masterId: string }) {
  const t = fr.masterPage.tabs;
  return (
    <SectionTabs
      label={fr.masterPage.tabsLabel}
      tabs={[
        { href: routes.master(masterId), label: t.overview, exact: true },
        { href: routes.masterAudio(masterId), label: t.audio },
        { href: routes.masterCredits(masterId), label: t.credits },
        { href: routes.masterRights(masterId), label: t.rights },
        { href: routes.masterProjects(masterId), label: t.projects },
        { href: routes.masterFiles(masterId), label: t.files },
      ]}
    />
  );
}
