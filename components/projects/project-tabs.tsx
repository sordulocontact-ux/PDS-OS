import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Sections of a launched project.
export function ProjectTabs({ projectId }: { projectId: string }) {
  const t = fr.shell.project.tabs;
  return (
    <SectionTabs
      label={fr.shell.project.tabsLabel}
      tabs={[
        { href: routes.project(projectId), label: t.overview, exact: true },
        // The framing starts from a call: calls come first.
        { href: routes.projectCalls(projectId), label: t.calls },
        { href: routes.projectFraming(projectId), label: t.framing },
        { href: routes.projectStrategy(projectId), label: t.strategy },
        { href: routes.projectRelease(projectId), label: t.release },
      ]}
    />
  );
}
