"use client";

import {
  DiscIcon,
  FolderKanbanIcon,
  HouseIcon,
  MicVocalIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: routes.app, label: fr.shell.nav.home, icon: HouseIcon, exact: true },
  {
    href: routes.projects,
    label: fr.shell.nav.projects,
    icon: FolderKanbanIcon,
  },
  { href: routes.artists, label: fr.shell.nav.artists, icon: MicVocalIcon },
  { href: routes.masters, label: fr.shell.nav.masters, icon: DiscIcon },
  {
    href: routes.members,
    label: fr.shell.nav.members,
    icon: UsersIcon,
    adminOnly: true,
  },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

// Main navigation, shared by the desktop sidebar and the mobile drawer.
// Hiding "Équipe" is comfort only: the page itself requires an admin.
export function NavLinks({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={fr.shell.nav.label}>
      <ul className="flex flex-col gap-0.5">
        {ITEMS.filter((item) => !("adminOnly" in item) || isAdmin).map(
          (item) => {
            const active = isActive(pathname, item.href, "exact" in item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    // NavItem, docs/DESIGN.md § 7: grey at rest, white on hover, active = raised ink + white rail.
                    "flex h-[var(--density-nav-item-h)] items-center gap-2.5 border-l-2 border-transparent px-3 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-medium text-[color:var(--po-grey-300)] no-underline transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--nav-item-hover-bg)] hover:text-[color:var(--nav-fg)] focus-visible:outline-[color:var(--nav-fg)]",
                    active &&
                      "border-[color:var(--nav-item-active-rail)] bg-[var(--nav-item-active-bg)] text-[color:var(--nav-fg)]",
                  )}
                >
                  <Icon
                    className="size-[18px] shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              </li>
            );
          },
        )}
      </ul>
    </nav>
  );
}
