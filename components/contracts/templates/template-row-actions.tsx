"use client";

import {
  IconCheck,
  IconEyeOpen,
  IconPenWriting2,
  IconXmark,
} from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { TemplateForm } from "@/components/contracts/templates/template-form";
import { TemplateView } from "@/components/contracts/templates/template-view";
import { ReasonForm } from "@/components/ui/reason-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { fr } from "@/lib/i18n/fr";
import { setContractTemplateStatus } from "@/lib/legal/contracts/template-actions";
import type { TemplateSeries } from "@/lib/legal/contracts/templates";

/** « ⋯ » of a template: read it, start a new version, validate (the
 * director), retire. */
export function TemplateRowActions({
  template,
  organizationId,
  size,
}: {
  template: TemplateSeries;
  organizationId: string;
  // On the template's own page header (JUR-19).
  size?: "icon-sm" | "icon-lg";
}) {
  const t = fr.legalContracts.templates;
  const router = useRouter();
  const [open, setOpen] = useState<
    "view" | "version" | "retire" | "refuse" | null
  >(null);
  const [, startTransition] = useTransition();

  const setStatus = (status: "validated" | "retired") =>
    startTransition(async () => {
      const result = await setContractTemplateStatus(template.id, status);
      if (!result.ok) return void toast.error(result.error);
      setOpen(null);
      router.refresh();
    });

  const actions: RowAction[] = [
    {
      key: "view",
      label: t.view,
      icon: IconEyeOpen,
      onSelect: () => setOpen("view"),
    },
    ...(template.can.validate
      ? [
          {
            key: "validate",
            label: t.validate,
            icon: IconCheck,
            onSelect: () => setStatus("validated"),
          },
        ]
      : []),
    // A draft refused by the director, with its reason (JUR-19).
    ...(template.can.validate
      ? [
          {
            key: "refuse",
            label: t.refuse,
            icon: IconXmark,
            onSelect: () => setOpen("refuse"),
          },
        ]
      : []),
    ...(template.can.newVersion
      ? [
          {
            key: "version",
            label: t.newVersion,
            icon: IconPenWriting2,
            onSelect: () => setOpen("version"),
          },
        ]
      : []),
    ...(template.can.retire
      ? [
          {
            key: "retire",
            label: t.retire,
            icon: IconXmark,
            onSelect: () => setOpen("retire"),
          },
        ]
      : []),
  ];
  const title = `${template.name} · ${t.version(template.version)}`;

  return (
    <>
      <RowActions
        label={fr.records.menu.label(template.name)}
        actions={actions}
        size={size}
      />
      <FormDialog
        open={open === "view"}
        onOpenChange={(next) => !next && setOpen(null)}
        title={title}
        description={template.usage ?? fr.contracts.types[template.type]}
        closeLabel={t.close}
        size="wide"
      >
        <TemplateView template={template} />
      </FormDialog>
      <FormDialog
        open={open === "version"}
        onOpenChange={(next) => !next && setOpen(null)}
        title={t.form.versionTitle(template.name)}
        description={t.description}
        closeLabel={t.close}
        size="wide"
      >
        <TemplateForm
          organizationId={organizationId}
          initial={{
            seriesId: template.seriesId,
            name: template.name,
            type: template.type,
            roles: template.roles,
            usage: template.usage ?? "",
            body: template.body,
            source: template.source,
          }}
          onCancel={() => setOpen(null)}
          onDone={() => {
            setOpen(null);
            router.refresh();
          }}
        />
      </FormDialog>
      <FormDialog
        open={open === "retire" || open === "refuse"}
        onOpenChange={(next) => !next && setOpen(null)}
        title={open === "refuse" ? t.refuseTitle : t.confirmRetireTitle}
        description={open === "refuse" ? t.refuseBody : t.confirmRetireBody}
        closeLabel={t.close}
      >
        <ReasonForm
          label={open === "refuse" ? t.refuseReason : t.retireReason}
          required={open === "refuse"}
          submitLabel={open === "refuse" ? t.refuse : t.retire}
          doneMessage={open === "refuse" ? t.refused : t.retired}
          run={(reason) =>
            setContractTemplateStatus(template.id, "retired", reason)
          }
          onDone={() => {
            setOpen(null);
            router.refresh();
          }}
        />
      </FormDialog>
    </>
  );
}
