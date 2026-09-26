"use client";

import { IconMenu } from "@/components/icons";
import { useState } from "react";

import { NavLinks } from "@/components/shell/nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fr } from "@/lib/i18n/fr";

// Mobile navigation: a drawer from the left edge, closed on navigation.
// The user panel is passed from the server (it holds the sign-out form).
export function MobileNav({
  isAdmin,
  footer,
}: {
  isAdmin: boolean;
  footer: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={fr.shell.nav.openMenu}
          />
        }
      >
        <IconMenu aria-hidden />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 border-none bg-sidebar px-0 py-3 text-sidebar-foreground"
      >
        <SheetHeader className="p-0 px-3 pt-1.5">
          <SheetTitle className="font-heading text-[length:var(--type-display-sm)] font-semibold text-[color:var(--nav-fg)]">
            {fr.app.name}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col justify-between gap-4">
          <NavLinks isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  );
}
