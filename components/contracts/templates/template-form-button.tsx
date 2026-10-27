"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { TemplateForm } from "@/components/contracts/templates/template-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";

/** « Nouveau modèle »: the form in the wide modal. */
export function TemplateFormButton({
  organizationId,
}: {
  organizationId: string;
}) {
  const t = fr.legalContracts.templates;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden />
        {t.create}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.form.title}
        description={t.description}
        closeLabel={t.close}
        size="wide"
      >
        <TemplateForm
          organizationId={organizationId}
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
          }}
        />
      </FormDialog>
    </>
  );
}
