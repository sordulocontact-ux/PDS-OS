"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "sonner";

import { ArtistPictureField } from "@/components/catalog/artist-page/artist-picture-field";
import { ArtistProfileForm } from "@/components/catalog/artist-page/artist-profile-form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ArtistDetail } from "@/lib/catalog/artist-types";
import { fr } from "@/lib/i18n/fr";

// "Modifier": side panel with the picture (applied at once) and the
// identity form (applied on "Enregistrer"), without leaving the page.
export function ArtistEditSheet({ artist }: { artist: ArtistDetail }) {
  const t = fr.catalog.profileForm;
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="lg" />}>
        <IconPenWriting2 aria-hidden data-icon="inline-start" />
        {fr.catalog.artistPage.edit}
      </SheetTrigger>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="px-5 pt-5 pr-14">
          <SheetTitle>{t.title}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <ArtistPictureField artist={artist} />
          <Separator />
          {/* Mounted per opening: the form starts from the saved values. */}
          {open && (
            <ArtistProfileForm
              artist={artist}
              onDone={(message) => {
                setOpen(false);
                if (message) toast.success(message);
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
