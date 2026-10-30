"use client";

import Link from "next/link";

import { IconSidebar } from "@/components/icons";
import { AccountMenu } from "@/components/shell/account-menu";
import { NavLinks } from "@/components/shell/nav-links";
import { PdsLogo } from "@/components/shell/pds-logo";
import { useCollapsedNav } from "@/components/shell/use-collapsed-nav";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";
import { cn } from "@/lib/utils";

const fr = { shell };

// Desktop sidebar against the screen's edge, full height, full width or
// collapsed to icons (Figma "PDS OS", nodes 47:12055 and 47:12047,
// docs/DESIGN.md § 4): the "PDS" square and the collapse button, the
// navigation, then the account and the bell. Collapsed by default inside a
// project; the IconSidebar button overrides it for the current visit only.
export function Sidebar({
  isAdmin,
  pendingMembers,
  bell,
  name,
  email,
}: {
  isAdmin: boolean;
  pendingMembers: number;
  bell: React.ReactNode;
  name: string;
  email: string | null;
}) {
  const { collapsed, toggle } = useCollapsedNav();
  const t = fr.shell.nav;

  return (
    <aside
      className={cn(
        "sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] shrink-0 flex-col justify-between gap-6 overflow-y-auto border-r border-[color:var(--nav-border)] bg-sidebar p-2 text-sidebar-foreground transition-[width] duration-[var(--duration-fast)] ease-[var(--ease-standard)] md:flex",
        collapsed ? "w-[var(--nav-width-collapsed)]" : "w-[var(--nav-width)]",
      )}
    >
      <div className="flex flex-col gap-6">
        <div
          className={cn(
            "flex items-center",
            collapsed ? "flex-col gap-1" : "justify-between px-4 pt-4",
          )}
        >
          {/* Always there, even collapsed (proto « Projet complet »: 40 px
              ink square); full width, the larger square of the Figma. */}
          <Link
            href={routes.app}
            aria-label={fr.shell.brand}
            className={cn(
              "flex items-center justify-center bg-[var(--nav-brand-bg)] text-[color:var(--nav-brand-fg)]",
              collapsed ? "size-10 rounded-xl" : "size-15 rounded-2xl",
            )}
          >
            <PdsLogo className={collapsed ? "w-6" : "w-9"} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-[var(--nav-item-hover-bg)]"
            aria-label={collapsed ? t.expand : t.collapse}
            onClick={toggle}
          >
            {/* 20 px icon, as in the navigation. */}
            <IconSidebar aria-hidden className="size-5" />
          </Button>
        </div>
        <NavLinks
          isAdmin={isAdmin}
          pendingMembers={pendingMembers}
          collapsed={collapsed}
        />
      </div>
      <div
        className={cn(
          "flex items-center gap-2 border-t border-[color:var(--nav-border)] pt-2",
          // Collapsed, the bell stays reachable above the avatar.
          collapsed && "flex-col",
        )}
      >
        {collapsed && bell}
        <AccountMenu name={name} email={email} collapsed={collapsed} />
        {!collapsed && <div className="pr-2">{bell}</div>}
      </div>
    </aside>
  );
}
