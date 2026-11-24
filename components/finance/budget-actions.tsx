"use client";

import {
  IconCalendarDays,
  IconPenWriting2,
  IconPlus,
  IconSliders,
  IconTrash,
} from "nucleo-sharp-essential";
import { useState } from "react";

import { BudgetLineForm } from "@/components/budget/budget-line-form";
import { BudgetImportForm } from "@/components/finance/budget-import-form";
import { RemoveBudgetDialog } from "@/components/finance/remove-budget-dialog";
import {
  CostCenterForm,
  RenameForm,
  ReviseForm,
  ShareForm,
  TemplateForm,
} from "@/components/finance/budget-forms";
import { ShowForm } from "@/components/finance/show-draw-forms";
import { IconCopy, IconRefresh, IconUpload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import type {
  BudgetTemplate,
  TemplateLine,
} from "@/lib/finance/budget-queries";
import type { ShowFormat } from "@/lib/finance/engines";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { fundings } from "@/lib/i18n/fr/fundings";

const fr = { dialogs, financeBudgets, fundings };

/** « Nouveau budget » (Finance › Budgets, the Finance only): the page's
 * main action, black, at the page's 40 px. */
export function NewBudgetButton({
  templates,
}: {
  templates: BudgetTemplate[];
}) {
  const t = fr.financeBudgets;
  return (
    <DialogButton
      label={t.actions.newBudget}
      icon={IconPlus}
      variant="default"
      size="default"
      title={t.centerForm.title}
      description=""
    >
      {(close) => <CostCenterForm templates={templates} onDone={close} />}
    </DialogButton>
  );
}

/** A template's card: « Nouveau budget depuis le modèle », the form opening
 * on that template (its lines become the budget's planned lines). */
export function NewFromTemplateButton({
  template,
  templates,
}: {
  template: BudgetTemplate;
  templates: BudgetTemplate[];
}) {
  const t = fr.financeBudgets;
  return (
    <DialogButton
      label={t.templates.use}
      size="sm"
      title={t.centerForm.title}
      description=""
    >
      {(close) => (
        <CostCenterForm
          templates={templates}
          initialTemplateId={template.id}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

/**
 * « Ajouter une dépense » on a budget's page: the one spend form, its target
 * (« Pour ») being this budget, so it is not asked again.
 */
export function AddEnvelopeSpendButton({
  kind,
  id,
  organizationId,
}: {
  kind: EnvelopeKind;
  id: string;
  organizationId: string;
}) {
  const t = fr.financeBudgets.actions;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="default" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.addSpend}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.addSpend}
        description=""
        closeLabel={fr.dialogs.close}
      >
        <BudgetLineForm
          target={{ kind, id }}
          line={null}
          organizationId={organizationId}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

type Gesture = "import" | "show" | "rename" | "revise" | "share" | "template";

/**
 * What the Finance does on one budget, in a « ⋯ » beside « Ajouter une
 * dépense »: rename and revise a cost center (with its reason), plan a
 * show, set the share PDS finances, keep its lines as a template, import
 * lines (where the reader writes them: `canImport`), remove a budget made by hand (never a project's or an
 * artist's). Every form opens in the panel on the right.
 */
export function EnvelopeMenu({
  kind,
  id,
  name,
  currentCents,
  shareBp,
  lines,
  formats,
  canManage,
  canImport,
}: {
  kind: EnvelopeKind;
  id: string;
  name: string;
  currentCents: number | null;
  shareBp: number;
  lines: TemplateLine[];
  formats: ShowFormat[];
  canManage: boolean;
  canImport: boolean;
}) {
  const t = fr.financeBudgets;
  const [open, setOpen] = useState<Gesture | "remove" | null>(null);
  const close = () => setOpen(null);
  const center = canManage && kind === "cost_center";
  const action = (
    key: Gesture | "remove",
    label: string,
    icon: RowAction["icon"],
  ): RowAction => ({ key, label, icon, onSelect: () => setOpen(key) });
  const actions: RowAction[] = [
    ...(canImport ? [action("import", t.actions.import, IconUpload)] : []),
    ...(center && formats.some((f) => !f.archived)
      ? [action("show", t.actions.planShow, IconCalendarDays)]
      : []),
    ...(center ? [action("rename", t.actions.rename, IconPenWriting2)] : []),
    ...(center ? [action("revise", t.actions.revise, IconRefresh)] : []),
    ...(canManage ? [action("share", t.actions.share, IconSliders)] : []),
    ...(canManage && lines.length > 0
      ? [action("template", t.actions.template, IconCopy)]
      : []),
    ...(center ? [action("remove", t.actions.removeBudget, IconTrash)] : []),
  ];
  const dialog: Record<Gesture, { title: string; form: React.ReactNode }> = {
    import: {
      title: t.importForm.title,
      form: <BudgetImportForm kind={kind} id={id} onDone={close} />,
    },
    show: {
      title: fr.fundings.shows.form.title,
      form: <ShowForm show={null} formats={formats} onDone={close} />,
    },
    rename: {
      title: t.renameForm.title,
      form: <RenameForm id={id} name={name} onDone={close} />,
    },
    revise: {
      title: t.reviseForm.title,
      form: <ReviseForm id={id} currentCents={currentCents} onDone={close} />,
    },
    share: {
      title: t.shareForm.title,
      form: <ShareForm kind={kind} id={id} shareBp={shareBp} onDone={close} />,
    },
    template: {
      title: t.templateForm.title,
      form: <TemplateForm lines={lines} onDone={close} />,
    },
  };
  return (
    <>
      <RowActions label={t.actions.more} actions={actions} size="icon-lg" />
      {open === "remove" && <RemoveBudgetDialog id={id} onClose={close} />}
      {open && open !== "remove" && (
        <FormDialog
          open
          onOpenChange={(next) => !next && close()}
          title={dialog[open].title}
          description=""
          closeLabel={fr.dialogs.close}
          size={open === "import" ? "wide" : "default"}
        >
          {dialog[open].form}
        </FormDialog>
      )}
    </>
  );
}
