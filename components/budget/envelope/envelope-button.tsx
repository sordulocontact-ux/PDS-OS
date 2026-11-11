"use client";

import { useState } from "react";

import { EnvelopeForm } from "@/components/budget/envelope/envelope-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import type { ArtistEnvelope } from "@/lib/budget/envelope";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { artistBudget, dialogs };

/** « Ouvrir l'enveloppe », « Modifier », « Nouvelle enveloppe »: the
 * direction's gestures on an artist's envelope, each in the common modal. */
export function EnvelopeButton({
  artistId,
  current,
  mode,
}: {
  artistId: string;
  current: ArtistEnvelope | null;
  mode: "open" | "reopen" | "edit";
}) {
  const t = fr.artistBudget;
  const [open, setOpen] = useState(false);
  const label = {
    open: t.envelope.open,
    reopen: t.envelope.reopen,
    edit: t.envelope.edit,
  }[mode];
  const title = {
    open: t.form.newTitle,
    reopen: t.form.reopenTitle,
    edit: t.form.editTitle,
  }[mode];
  return (
    <>
      <Button
        variant={mode === "open" ? "default" : "outline"}
        size={mode === "open" ? "lg" : "default"}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={
          mode === "reopen" ? t.form.reopenDescription : t.form.description
        }
        closeLabel={fr.dialogs.close}
        size="medium"
      >
        <EnvelopeForm
          artistId={artistId}
          current={current}
          mode={mode}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}
