"use client";

import {
  IconCalendarDays,
  IconPlus,
  IconSliders,
} from "nucleo-sharp-essential";
import { useState } from "react";

import {
  CreditLineForm,
  ShowFormatForm,
} from "@/components/finance/funding-forms";
import { OrchardContractForm } from "@/components/finance/orchard-contract-form";
import { DrawForm, ShowForm } from "@/components/finance/show-draw-forms";
import { IconCopy } from "@/components/icons";
import { DialogButton } from "@/components/ui/dialog-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import type {
  CreditLine,
  EngineSettings,
  ShowFormat,
} from "@/lib/finance/engines";
import type { FinanceSpend } from "@/lib/finance/spends";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { fundings } from "@/lib/i18n/fr/fundings";

const fr = { dialogs, fundings };

/**
 * « Planifier une émission »: the show form, in the panel, from wherever a
 * show is planned (Financements' bar, Budgets and a budget's page: one
 * form, never a link out). Nothing while no format exists to plan it on.
 */
export function PlanShowButton({
  formats,
  variant = "default",
}: {
  formats: ShowFormat[];
  variant?: "default" | "outline";
}) {
  const t = fr.fundings.shows;
  if (!formats.some((f) => !f.archived)) return null;
  return (
    <DialogButton
      label={t.plan}
      icon={IconPlus}
      variant={variant}
      size="default"
      title={t.form.title}
      description={t.form.description}
    >
      {(close) => <ShowForm show={null} formats={formats} onDone={close} />}
    </DialogButton>
  );
}

type Gesture = "format" | "line" | "draw" | "settings";

/**
 * The bar of Financements (top right, 40 px, as the other pages): «
 * Planifier une émission » in black, and a « ⋯ » with the rest: a new show
 * format, a new Pay Later credit, financing a spend, the Orchard rule.
 */
export function FundingActions({
  formats,
  settings,
  lines,
  spends,
}: {
  formats: ShowFormat[];
  settings: EngineSettings;
  lines: CreditLine[];
  // The spends not paid yet nor financed already.
  spends: FinanceSpend[];
}) {
  const [open, setOpen] = useState<Gesture | null>(null);
  const close = () => setOpen(null);
  const f = fr.fundings;
  const action = (
    key: Gesture,
    label: string,
    icon: RowAction["icon"],
  ): RowAction => ({ key, label, icon, onSelect: () => setOpen(key) });
  const actions: RowAction[] = [
    action("format", f.formats.add, IconCopy),
    action("line", f.payLater.addLine, IconPlus),
    ...(lines.some((l) => !l.archived)
      ? [action("draw", f.payLater.draw, IconCalendarDays)]
      : []),
    action("settings", f.orchard.edit, IconSliders),
  ];
  const dialog: Record<
    Gesture,
    { title: string; description: string; form: React.ReactNode }
  > = {
    format: {
      title: f.formats.form.title,
      description: f.formats.form.description,
      form: <ShowFormatForm onDone={close} />,
    },
    line: {
      title: f.payLater.lineForm.title,
      description: f.payLater.lineForm.description,
      form: <CreditLineForm onDone={close} />,
    },
    draw: {
      title: f.payLater.drawForm.title,
      description: f.payLater.drawForm.description,
      form: <DrawForm lines={lines} spends={spends} onDone={close} />,
    },
    settings: {
      title: f.orchard.form.title,
      description: f.orchard.form.description,
      form: <OrchardContractForm settings={settings} onDone={close} />,
    },
  };
  return (
    <>
      <PlanShowButton formats={formats} />
      <RowActions label={f.more} actions={actions} size="icon-lg" />
      {open && (
        <FormDialog
          open
          onOpenChange={(next) => !next && close()}
          title={dialog[open].title}
          description={dialog[open].description}
          closeLabel={fr.dialogs.close}
        >
          {dialog[open].form}
        </FormDialog>
      )}
    </>
  );
}
