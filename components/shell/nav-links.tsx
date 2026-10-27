"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItemActiveClass, navItemClass } from "@/components/shell/nav-item";
import { useWorkCount } from "@/components/shell/work-count";
import { CountBadge } from "@/components/ui/count-badge";
import { LinkPendingReporter } from "@/components/ui/navigation-progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { routes } from "@/lib/auth/redirects";
import { moduleFrame } from "@/lib/i18n/fr/module-frame";
import { shell } from "@/lib/i18n/fr/shell";
import { NAV_ITEMS } from "@/lib/ui/nav-items";
import { cn } from "@/lib/utils";

const fr = { shell, moduleFrame };

function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

// Main navigation, shared by the desktop sidebar (full-width or collapsed to
// icons, Figma "Nav1 open" / "Double sidebar") and the mobile drawer.
// Hiding "Équipe" is comfort only: the page itself requires an admin.
// Access requests waiting for a decision show as a count on "Équipe", which
// then opens straight on them (the team page opens on approved members).
// Outside a project, « Travail » carries the viewer's « À vous » count over
// every project (lib/work/journeys.ts). Inside a project, it carries that
// project's count (proto « Projet complet », reported by its layout) and
// opens that project's Travail, where these actions are listed (proto:
// « Travail → Travail du projet »; the global Travail does not list the
// journeys' actions, so its count and its page disagreed — recette 19/10).
const PROJECT_PATH = /^\/app\/projects\/([0-9a-f-]{36})(?:\/|$)/;

export function NavLinks({
  isAdmin,
  pendingMembers = 0,
  collapsed = false,
  onNavigate,
}: {
  isAdmin: boolean;
  pendingMembers?: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = fr.shell.nav;
  const projectId = PROJECT_PATH.exec(pathname)?.[1];
  const workCount = useWorkCount(Boolean(projectId));

  return (
    <nav aria-label={t.label}>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const href =
            item.href === routes.work && projectId
              ? routes.projectWork(projectId)
              : item.href;
          const active = isActive(pathname, href, item.exact ?? false);
          const Icon = item.icon;
          const mine = item.href === routes.work ? workCount : 0;
          const count = item.href === routes.members ? pendingMembers : 0;
          const label = item.disabled
            ? `${item.label} — ${t.comingSoon}`
            : count > 0
              ? `${item.label}, ${t.pendingMembers(count)}`
              : mine > 0
                ? `${item.label}, ${fr.moduleFrame.mine(mine)}`
                : item.label;

          const link = (
            <Link
              href={
                item.disabled
                  ? item.href
                  : count > 0
                    ? `${item.href}?status=pending`
                    : href
              }
              onClick={
                item.disabled ? (event) => event.preventDefault() : onNavigate
              }
              aria-current={active ? "page" : undefined}
              aria-disabled={item.disabled}
              aria-label={
                collapsed || item.disabled || count > 0 || mine > 0
                  ? label
                  : undefined
              }
              className={cn(
                navItemClass,
                "relative",
                collapsed && "justify-center px-0",
                active && navItemActiveClass,
                item.disabled &&
                  "cursor-not-allowed text-[color:var(--nav-fg-muted)] hover:bg-transparent",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {!collapsed && item.label}
              {!collapsed && count > 0 && (
                <CountBadge count={count} className="ml-auto" />
              )}
              {mine > 0 && (
                <CountBadge
                  count={mine}
                  size="sm"
                  className={
                    collapsed ? "absolute top-0.5 right-1.5" : "ml-auto"
                  }
                />
              )}
              <LinkPendingReporter />
            </Link>
          );

          return (
            <li key={item.label}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger render={link} />
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
