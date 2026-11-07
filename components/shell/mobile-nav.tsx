"use client";

import { useState } from "react";

import { IconMenu } from "@/components/icons";
import { NavLinks } from "@/components/shell/nav-links";
import { PdsLogo } from "@/components/shell/pds-logo";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { dialogs, shell };

// Mobile navigation: the common modal, which rises from the bottom of a
// phone (Sacha, 07/11/2026: no drawer from the side), closed on navigation.
// The user panel is passed from the server (it holds the sign-out form).
// Waiting access requests are counted on the menu button too, since the
// "Équipe" item that carries them is hidden in the menu.
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
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
      </DialogTrigger>
      <DialogContent closeLabel={fr.dialogs.close}>
        <DialogHeader>
          <DialogTitle className="text-[color:var(--nav-fg)]">
            <PdsLogo className="w-8" />
            <span className="sr-only">{fr.shell.brand}</span>
          </DialogTitle>
        </DialogHeader>
        <NavLinks
          isAdmin={isAdmin}
          pendingMembers={pendingMembers}
          onNavigate={() => setOpen(false)}
        />
        {/* The feedback button opens its window: close the menu first. */}
        <div
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("a, [data-close-nav]")) setOpen(false);
          }}
        >
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}
