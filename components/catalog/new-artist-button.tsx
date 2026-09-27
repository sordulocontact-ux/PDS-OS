"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { CreateArtistDialog } from "@/components/catalog/create-artist-dialog";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

// Opens the "Nouvel artiste" modal. Once created, the new artist's page opens:
// its profile (contacts, files, masters) is what comes next.
export function NewArtistButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {fr.catalog.artists.newArtist}
      </Button>
      <CreateArtistDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
