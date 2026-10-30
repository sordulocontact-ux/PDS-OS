"use client";

import { IconMenu } from "@/components/icons";
import { useState } from "react";

import { NavLinks } from "@/components/shell/nav-links";
import { PdsLogo } from "@/components/shell/pds-logo";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

// Mobile navigation: a drawer from the left edge, closed on navigation.
// The user panel is passed from the server (it holds the sign-out form).
// Waiting access requests are counted on the menu button too, since the
// "Équipe" item that carries them is hidden in the drawer.
export function MobileNav({
  isAdmin,
  pendingMembers = 0,
  footer,
}: {
  isAdmin: boolean;
  pendingMembers?: number;
  footer: React.ReactNode;
}) {
  const t = fr.shell.nav;
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="relative"
            aria-label={
              pendingMembers > 0
                ? `${t.openMenu}, ${t.pendingMembers(pendingMembers)}`
                : t.openMenu
            }
          />
        }
      >
        <IconMenu aria-hidden />
        {pendingMembers > 0 && (
          <CountBadge
            count={pendingMembers}
            className="absolute -top-0.5 -right-0.5"
          />
        )}
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 gap-6 border-none bg-sidebar px-6 py-4 text-sidebar-foreground"
      >
        <SheetHeader className="p-0 pt-1.5">
          <SheetTitle className="text-[color:var(--nav-fg)]">
            <PdsLogo className="w-8" />
            <span className="sr-only">{fr.shell.brand}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col justify-between gap-6">
          <NavLinks
            isAdmin={isAdmin}
            pendingMembers={pendingMembers}
            onNavigate={() => setOpen(false)}
          />
          {/* The feedback button opens its window: close the drawer first. */}
          <div
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("a, [data-close-nav]")) setOpen(false);
            }}
          >
            {footer}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
