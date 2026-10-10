"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import type { PostScope } from "@/lib/production/post/types";

import { ReferenceForm } from "./reference-form";

const t = fr.productionPost;

/** « Ajouter une référence » and its dialog. */
export function ReferenceAddButton({ scope }: { scope: PostScope }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.references.add}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.references.addTitle}
        description={t.references.addDescription}
        closeLabel={t.close}
      >
        <ReferenceForm scope={scope} onDone={() => setOpen(false)} />
      </FormDialog>
    </>
  );
}
