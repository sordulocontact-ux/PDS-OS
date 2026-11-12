"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import type { NewDealOptions } from "@/lib/deals/new-deal-options";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { deals, dialogs };

// The form is loaded when the dialog first opens.
const NewDealForm = dynamic(() =>
  import("@/components/deals/new-deal-form").then((m) => m.NewDealForm),
);

/** « Nouveau deal », for the direction and the project managers (BIZ 4);
 * from an abandoned deal, « Ouvrir un nouveau deal » with its artist
 * already chosen (`artistId`, `label`). */
export function NewDealButton({
  options,
  artistId,
  label,
}: {
  options: NewDealOptions;
  artistId?: string | null;
  label?: string;
}) {
  const t = fr.deals.create;
  const [open, setOpen] = useState(false);
  return (
    <>
      <div>
        <Button onClick={() => setOpen(true)}>{label ?? t.button}</Button>
      </div>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={options.own ? t.ownDescription : t.description}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <NewDealForm
            options={options}
            artistId={artistId ?? null}
            onDone={() => setOpen(false)}
          />
        )}
      </FormDialog>
    </>
  );
}
