"use client";

import { TemplateForm } from "@/components/contracts/templates/template-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import type { FormRole } from "@/lib/legal/forms/definition";

const fr = { legalContracts, legalDocuments };

/**
 * « Nouveau modèle de contrat » for a person of the contracts to provide
 * for (proto « Projet complet », rule 18), opened from the end of their
 * contract menu (Sacha 26/11/2026: « depuis le select un créer un
 * nouveau »): the template form, its roles ticked with the person's. It
 * enters the library once the direction validates it, and is taken for
 * that person.
 */
export function NewTemplateDialog({
  open,
  onOpenChange,
  organizationId,
  roles,
  request,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  roles: FormRole[];
  // The project and the person it is made for: asked of the direction.
  request: { projectId: string; key: string; name: string };
  // Sent: the caller reads the person's line again (« Nouveau contrat »).
  onDone?: () => void;
}) {
  const t = fr.legalContracts;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.agreements.plan.newTemplate}
      description={fr.legalDocuments.template.modalBody}
      closeLabel={t.templates.close}
      size="document"
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
        onCancel={() => onOpenChange(false)}
        onDone={() => {
          onOpenChange(false);
          onDone?.();
        }}
      />
    </FormDialog>
  );
}
