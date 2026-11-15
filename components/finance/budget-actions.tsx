"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { BudgetImportForm } from "@/components/finance/budget-import-form";
import {
  CostCenterForm,
  ReviseForm,
  ShareForm,
  TemplateForm,
} from "@/components/finance/budget-forms";
import { DialogButton } from "@/components/ui/dialog-button";
import type {
  BudgetTemplate,
  TemplateLine,
} from "@/lib/finance/budget-queries";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";

const fr = { financeBudgets };

/** « Nouveau centre de coût » (Finance › Budgets, the Finance only). */
export function NewCostCenterButton({
  templates,
}: {
  templates: BudgetTemplate[];
}) {
  const t = fr.financeBudgets;
  return (
    <DialogButton
      label={t.actions.newCenter}
      icon={IconPlus}
      variant="default"
      size="lg"
      title={t.centerForm.title}
      description={t.centerForm.description}
    >
      {(close) => <CostCenterForm templates={templates} onDone={close} />}
    </DialogButton>
  );
}

/**
 * What the Finance does on one envelope: revise a cost center (with its
 * reason), set the share PDS finances, keep its lines as a template, import
 * lines (where the reader writes them: `canImport`).
 */
export function EnvelopeActions({
  kind,
  id,
  currentCents,
  shareBp,
  lines,
  canManage,
  canImport,
}: {
  kind: EnvelopeKind;
  id: string;
  currentCents: number | null;
  shareBp: number;
  lines: TemplateLine[];
  canManage: boolean;
  canImport: boolean;
}) {
  const t = fr.financeBudgets;
  return (
    <div className="flex flex-wrap gap-2">
      {canImport && (
        <DialogButton
          label={t.actions.import}
          title={t.importForm.title}
          description={t.importForm.description}
          wide
        >
          {(close) => <BudgetImportForm kind={kind} id={id} onDone={close} />}
        </DialogButton>
      )}
      {canManage && kind === "cost_center" && (
        <DialogButton
          label={t.actions.revise}
          title={t.reviseForm.title}
          description={t.reviseForm.description}
        >
          {(close) => (
            <ReviseForm id={id} currentCents={currentCents} onDone={close} />
          )}
        </DialogButton>
      )}
      {canManage && (
        <DialogButton
          label={t.actions.share}
          title={t.shareForm.title}
          description={t.shareForm.description}
        >
          {(close) => (
            <ShareForm kind={kind} id={id} shareBp={shareBp} onDone={close} />
          )}
        </DialogButton>
      )}
      {canManage && lines.length > 0 && (
        <DialogButton
          label={t.actions.template}
          title={t.templateForm.title}
          description={t.templateForm.description(lines.length)}
        >
          {(close) => <TemplateForm lines={lines} onDone={close} />}
        </DialogButton>
      )}
    </div>
  );
}
