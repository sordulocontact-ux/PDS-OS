"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { deals, dialogs };

/**
 * « Ouvrir un deal » for whoever negotiates but may not open one (UX test
 * of 12/11/2026: the button was simply absent): it says who opens a deal
 * (the direction, by name, or the project's owner), who then entrusts it.
 */
export function AskDealButton({ directors }: { directors: string[] }) {
  const t = fr.deals.create;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t.askTitle}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.askTitle}
        description={t.askBody(directors.join(", "))}
        closeLabel={fr.dialogs.close}
      >
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>{t.askClose}</Button>
        </div>
      </FormDialog>
    </>
  );
}
