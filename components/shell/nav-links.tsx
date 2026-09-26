"use client";

import {
  IconFolderOpen,
  IconHouse2,
  IconMicrophone,
  IconUsers2,
} from "nucleo-sharp-essential";
import { IconDisc } from "@/components/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: routes.app, label: fr.shell.nav.home, icon: IconHouse2, exact: true },
  {
    href: routes.projects,
    label: fr.shell.nav.projects,
    icon: IconFolderOpen,
  },
  { href: routes.artists, label: fr.shell.nav.artists, icon: IconMicrophone },
  { href: routes.masters, label: fr.shell.nav.masters, icon: IconDisc },
  {
    href: routes.members,
    label: fr.shell.nav.members,
    icon: IconUsers2,
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
      <ul className="flex flex-col gap-3">
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
                    // NavItem, Figma "Desktop - 11": 40 px, 24 px icon, grey fill when active.
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-medium text-[color:var(--nav-fg)] no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--nav-item-hover-bg)]",
                    active &&
                      "bg-[var(--nav-item-active-bg)] hover:bg-[var(--nav-item-active-bg)]",
                  )}
                >
                  <Icon className="size-6 shrink-0" aria-hidden />
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
