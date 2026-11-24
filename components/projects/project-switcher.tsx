"use client";

import { usePathname } from "next/navigation";

import { SwitcherMenu } from "@/components/shell/switcher-menu";
import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";
import {
  loadProjectSwitcher,
  type SwitcherProject,
} from "@/lib/projects/switcher-actions";

const fr = { shell };

// Where a project of the switcher leads: the same section of the other
// project when it has sections (launched), its first page otherwise. Only the
// section is kept — a call or a Juridique step of this project means nothing
// in the other one.
function switchHref(
  pathname: string,
  fromId: string,
  to: SwitcherProject,
): string {
  const base = routes.project(to.id);
  if (!to.launched) return base;
  const section = pathname
    .slice(routes.project(fromId).length)
    .split("/")
    .filter(Boolean)[0];
  return section ? `${base}/${section}` : base;
}

// Top of a project's sidebar (Figma "PDS OS", node 47:12056): the project's
// title with a double chevron, opening the other projects to switch to, with a
// search, as Vercel and Supabase do (SwitcherMenu). The list is read when it
// opens.
export function ProjectSwitcher({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const pathname = usePathname();
  const t = fr.shell.project.sidebar.switcher;
  return (
    <SwitcherMenu
      name={projectTitle}
      currentId={projectId}
      variant="nav"
      allHref={routes.projects}
      load={async () =>
        (await loadProjectSwitcher()).map((project) => ({
          id: project.id,
          label: project.title,
          detail: project.artistName || null,
          href: switchHref(pathname, projectId, project),
        }))
      }
      labels={{ ...t, open: t.open(projectTitle) }}
    />
  );
}
