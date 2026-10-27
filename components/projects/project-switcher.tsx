"use client";

import { IconCheck, IconChevronExpandY } from "nucleo-sharp-essential";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Loaded } from "@/components/ui/loaded";
import { ViewLink } from "@/components/ui/view-link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchableList } from "@/components/ui/searchable-list";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  loadProjectSwitcher,
  type SwitcherProject,
} from "@/lib/projects/switcher-actions";
import { cn } from "@/lib/utils";

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
// search, as Vercel and Supabase do. The list is read when it opens.
export function ProjectSwitcher({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = fr.shell.project.sidebar.switcher;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t.open(projectTitle)}
        className="flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-body-md font-semibold text-[color:var(--nav-fg)] transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--nav-item-hover-bg)] aria-expanded:bg-[var(--nav-item-active-bg)]"
      >
        <span className="min-w-0 flex-1 truncate" title={projectTitle}>
          {projectTitle}
        </span>
        <IconChevronExpandY aria-hidden className="size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-80 gap-2 p-2">
        <Loaded
          load={loadProjectSwitcher}
          loadingLabel={t.loading}
          errorLabel={t.error}
        >
          {(projects) => (
            <SearchableList
              items={projects}
              searchText={(project) => [project.title, project.artistName]}
              label={t.search}
              placeholder={t.placeholder}
              noResult={t.noResult}
            >
              {(visible) => (
                <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto overscroll-contain">
                  {visible.map((project) => {
                    const current = project.id === projectId;
                    return (
                      <li key={project.id}>
                        {/* Prepared on intent: an open list must not render
                            every project at once (page loads audit, 27/10). */}
                        <ViewLink
                          href={switchHref(pathname, projectId, project)}
                          onClick={() => setOpen(false)}
                          aria-current={current ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 no-underline hover:bg-[var(--nav-item-hover-bg)]",
                            current && "bg-[var(--nav-item-active-bg)]",
                          )}
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-body-md font-medium">
                              {project.title}
                            </span>
                            {project.artistName && (
                              <span className="truncate text-caption text-[color:var(--nav-fg-muted)]">
                                {project.artistName}
                              </span>
                            )}
                          </span>
                          {current && (
                            <IconCheck
                              aria-hidden
                              className="size-4 shrink-0"
                            />
                          )}
                        </ViewLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SearchableList>
          )}
        </Loaded>
        <div className="border-t border-[color:var(--nav-border)] pt-2">
          <Link
            href={routes.projects}
            onClick={() => setOpen(false)}
            className="flex h-10 items-center rounded-lg px-3 text-body-md font-medium no-underline hover:bg-[var(--nav-item-hover-bg)]"
          >
            {t.all}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
