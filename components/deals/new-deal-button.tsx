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

/** « Nouveau deal », for the direction and the project managers (BIZ 4). */
export function NewDealButton({ options }: { options: NewDealOptions }) {
  const t = fr.deals.create;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{t.button}</Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <NewDealForm options={options} onDone={() => setOpen(false)} />
        )}
      </FormDialog>
    </>
  );
}
