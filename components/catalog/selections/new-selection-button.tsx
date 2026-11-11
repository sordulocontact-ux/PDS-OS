"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { ArtistChoiceField } from "@/components/catalog/selections/artist-choice-field";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { createArtistSelection } from "@/lib/catalog/selection-actions";
import type { ArtistOption } from "@/lib/catalog/types";
import { artistSelections } from "@/lib/i18n/fr/artist-selections";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { artistSelections, dialogs };

/** « Nouvelle sélection »: its name and first artists, in the modal; the
 * new selection's page opens once it is created. */
export function NewSelectionButton({ artists }: { artists: ArtistOption[] }) {
  const t = fr.artistSelections.new;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.button}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <NewSelectionForm artists={artists} onDone={() => setOpen(false)} />
        )}
      </FormDialog>
    </>
  );
}

function NewSelectionForm({
  artists,
  onDone,
}: {
  artists: ArtistOption[];
  onDone: () => void;
}) {
  const t = fr.artistSelections.new;
  const router = useRouter();
  const [chosen, setChosen] = useState<ArtistOption[]>([]);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("name") ?? "",
        ).trim();
        setMissing(!name);
        // The field in red takes the focus (docs/DESIGN.md « Manques à la
        // validation »).
        if (!name)
          return void document.getElementById("selection-name")?.focus();
        run(async () => {
          const result = await createArtistSelection({
            name,
            artistIds: chosen.map((a) => a.id),
          });
          if (result.ok) router.push(routes.artistSelection(result.id));
          return result;
        });
      }}
    >
      <Field
        id="selection-name"
        // Back to normal as soon as it is filled (docs/DESIGN.md).
        onChange={(event) =>
          event.currentTarget.value.trim() && setMissing(false)
        }
        name="name"
        label={t.name}
        required
        placeholder={t.namePlaceholder}
        maxLength={120}
        autoFocus
        autoComplete="off"
        error={missing ? t.nameRequired : undefined}
      />
      <ArtistChoiceField
        artists={artists}
        value={chosen}
        onChange={setChosen}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
