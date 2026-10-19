"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItemActiveClass, navItemClass } from "@/components/shell/nav-item";
import { useWorkCount } from "@/components/shell/work-count";
import { CountBadge } from "@/components/ui/count-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { NAV_ITEMS } from "@/lib/ui/nav-items";
import { cn } from "@/lib/utils";

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
// Inside a project, « Travail » carries the viewer's « À vous » count of that
// project (proto « Projet complet », reported by the project's layout).
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
  const workCount = useWorkCount();

  return (
    <nav aria-label={t.label}>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const active = isActive(pathname, item.href, item.exact ?? false);
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
                    : item.href
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
