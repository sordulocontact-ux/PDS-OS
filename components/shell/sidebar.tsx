"use client";

import Link from "next/link";

import { IconSidebar } from "@/components/icons";
import { NavLinks } from "@/components/shell/nav-links";
import { useCollapsedNav } from "@/components/shell/use-collapsed-nav";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Desktop sidebar, full width or collapsed to icons (Figma "Nav1 open" /
// "Double sidebar", docs/DESIGN.md § 4). Collapsed by default inside a
// project; the IconSidebar button overrides it for the current visit only.
export function Sidebar({
  isAdmin,
  pendingMembers,
  bell,
  userPanel,
}: {
  isAdmin: boolean;
  pendingMembers: number;
  bell: React.ReactNode;
  userPanel: React.ReactNode;
}) {
  const { collapsed, doubleSidebar, toggle } = useCollapsedNav();
  const t = fr.shell.nav;

  return (
    <aside
      className={cn(
        "sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] shrink-0 flex-col justify-between gap-6 overflow-y-auto rounded-3xl bg-sidebar p-2 text-sidebar-foreground shadow-[var(--nav-shadow)] transition-[width] duration-[var(--duration-fast)] ease-[var(--ease-standard)] md:flex",
        collapsed ? "w-[var(--nav-width-collapsed)]" : "w-[var(--nav-width)]",
        // Fused with the project's contextual sidebar right next to it
        // (Figma "Double sidebar"): one rectangle, so no rounding or hairline
        // where the two meet.
        doubleSidebar && "rounded-tr-none rounded-br-none",
      )}
    >
      <div className="flex flex-col gap-6">
        <div
          className={cn(
            "flex items-center gap-2",
            // Expanded, the brand lines up with the navigation's icons.
            collapsed ? "flex-col" : "justify-between pl-4",
          )}
        >
          {!collapsed && (
            <Link
              href={routes.app}
              className="text-base font-bold no-underline [text-box:trim-both_cap_alphabetic]"
            >
              {fr.shell.brand}
            </Link>
          )}
          {!collapsed && <div className="-my-3.5">{bell}</div>}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-[var(--nav-item-hover-bg)]"
            aria-label={collapsed ? t.expand : t.collapse}
            onClick={toggle}
          >
            {/* Same button and 20 px icon as the bell and the navigation. */}
            <IconSidebar aria-hidden className="size-5" />
          </Button>
        </div>
        <NavLinks
          isAdmin={isAdmin}
          pendingMembers={pendingMembers}
          collapsed={collapsed}
        />
      </div>
      {!collapsed && userPanel}
    </aside>
  );
}
