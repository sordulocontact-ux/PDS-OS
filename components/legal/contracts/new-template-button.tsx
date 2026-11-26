"use client";

import { useState } from "react";

import { TemplateForm } from "@/components/contracts/templates/template-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import type { FormRole } from "@/lib/legal/forms/definition";

const fr = { legalContracts, legalDocuments };

/**
 * « Nouveau modèle de contrat » from a person of the contracts to provide
 * for (proto « Projet complet », rule 18): the template form in the glass
 * modal, its roles ticked with the person's. It enters the library once the
 * direction validates it.
 */
export function NewTemplateButton({
  organizationId,
  roles,
  request,
  onDone,
}: {
  organizationId: string;
  roles: FormRole[];
  // The project and the person it is made for: asked of the direction.
  request: { projectId: string; key: string; name: string };
  // Sent: the caller reads the person's line again (« Nouveau contrat »).
  onDone?: () => void;
}) {
  const t = fr.legalContracts;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        {t.agreements.plan.newTemplate}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.agreements.plan.newTemplate}
        description={fr.legalDocuments.template.modalBody}
        closeLabel={t.templates.close}
        size="wide"
      >
        <TemplateForm
          organizationId={organizationId}
          initial={{
            seriesId: null,
            name: "",
            type: "other",
            roles,
            usage: "",
            body: "",
            source: null,
          }}
          request={request}
          submitLabel={fr.legalDocuments.template.send}
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            onDone?.();
          }}
        />
      </FormDialog>
    </>
  );
}
