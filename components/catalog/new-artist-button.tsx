"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { CreateArtistDialog } from "@/components/catalog/create-artist-dialog";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

// Opens the "Nouvel artiste" modal. On success the modal closes and the list
// refreshes in place (the action revalidates it): no redirect, the director
// is likely adding several artists in a row.
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
