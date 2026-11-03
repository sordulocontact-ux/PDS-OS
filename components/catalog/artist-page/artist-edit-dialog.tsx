"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { ArtistPictureField } from "@/components/catalog/artist-page/artist-picture-field";
import { ArtistProfileForm } from "@/components/catalog/artist-page/artist-profile-form";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { Separator } from "@/components/ui/separator";
import type { ArtistDetail } from "@/lib/catalog/artist-types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { records } from "@/lib/i18n/fr/records";

const fr = { catalog, records };

// "Modifier": modal with the picture (applied at once) and the identity
// form (applied on "Enregistrer"), without leaving the page.
export function ArtistEditDialog({ artist }: { artist: ArtistDetail }) {
  const t = fr.catalog.profileForm;
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={t.title}
      description={t.description}
      closeLabel={fr.records.edit.close}
      trigger={
        <DialogTrigger render={<Button variant="outline" size="lg" />}>
          <IconPenWriting2 aria-hidden data-icon="inline-start" />
          {fr.catalog.artistPage.edit}
        </DialogTrigger>
      }
    >
      <ArtistEditBody artist={artist} onDone={() => setOpen(false)} />
    </FormDialog>
  );
}

/** Picture and identity of an artist, inside a FormDialog. */
export function ArtistEditBody({
  artist,
  onDone,
}: {
  artist: ArtistDetail;
  onDone: () => void;
}) {
  return (
    <>
      <ArtistPictureField artist={artist} />
      <Separator />
      <ArtistProfileForm
        artist={artist}
        onDone={(message) => {
          onDone();
          if (message) toast.success(message);
        }}
      />
    </>
  );
}
