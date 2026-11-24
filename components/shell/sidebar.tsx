"use client";

import Link from "next/link";
import { useRef } from "react";

import { IconSidebar } from "@/components/icons";
import { AccountMenu } from "@/components/shell/account-menu";
import { AppSearch } from "@/components/shell/app-search";
import { NavLinks } from "@/components/shell/nav-links";
import { PdsLogo } from "@/components/shell/pds-logo";
import { useCollapsedNav } from "@/components/shell/use-collapsed-nav";
import { Button } from "@/components/ui/button";
import { scrollFadeY, useScrollFade } from "@/components/ui/use-scroll-fade";
import { routes, type Permission } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";
import { cn } from "@/lib/utils";

const fr = { shell };

// Desktop sidebar against the screen's edge, full height, full width or
// collapsed to icons (Figma "PDS OS", nodes 47:12055 and 47:12047,
// docs/DESIGN.md § 4): the "PDS" square and the collapse button, the
// search (⌘K) then the navigation, then the account and the bell. Collapsed by default inside a
// project; the IconSidebar button overrides it for the current visit only.
// On a short screen the head and the account stay put and only the pages
// scroll between them, fading at the edge with more (Sacha, 16/11/2026, as
// Vercel's and Supabase's).
export function Sidebar({
  isAdmin,
  permissions,
  pendingMembers,
  bell,
  name,
  email,
}: {
  isAdmin: boolean;
  permissions: readonly Permission[];
  pendingMembers: number;
  bell: React.ReactNode;
  name: string;
  email: string | null;
}) {
  const { collapsed, toggle } = useCollapsedNav();
  const t = fr.shell.nav;
  const pagesRef = useRef<HTMLDivElement>(null);
  useScrollFade(pagesRef, "y");

  return (
    <aside
      className={cn(
        "sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] shrink-0 flex-col gap-6 overflow-hidden border-r border-[color:var(--nav-border)] bg-sidebar p-2 text-sidebar-foreground transition-[width] duration-[var(--duration-fast)] ease-[var(--ease-standard)] md:flex",
        collapsed ? "w-[var(--nav-width-collapsed)]" : "w-[var(--nav-width)]",
      )}
    >
      {/* The head keeps its height either way and the button its line, so
          nothing under it moves when the column collapses; collapsed, the
          logo goes and the button alone stays (Sacha, 17/11/2026), Accueil
          leading home. */}
      <div
        className={cn(
          "flex h-19 shrink-0 items-center pt-4",
          collapsed ? "justify-center" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <Link
            href={routes.app}
            aria-label={fr.shell.brand}
            className="flex size-15 items-center justify-center rounded-2xl bg-[var(--nav-brand-bg)] text-[color:var(--nav-brand-fg)]"
          >
            <PdsLogo entryLanding className="w-9" />
          </Link>
        )}
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
      <div
        ref={pagesRef}
        className={cn(
          "-mx-2 flex min-h-0 flex-1 flex-col gap-1 px-2",
          scrollFadeY,
        )}
      >
        {/* The app's ⌘K, first of the navigation (Sacha 24/11/2026). */}
        <AppSearch collapsed={collapsed} />
        <NavLinks
          isAdmin={isAdmin}
          permissions={permissions}
          pendingMembers={pendingMembers}
          collapsed={collapsed}
        />
      </div>
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-t border-[color:var(--nav-border)] pt-2",
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
