"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { BudgetLineForm } from "@/components/budget/budget-line-form";
import { targetKey } from "@/components/budget/budget-target-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { loadExpenseTargets } from "@/lib/budget/target-actions";
import { budget } from "@/lib/i18n/fr/budget";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { budget, dialogs };

/**
 * « Ajouter une dépense » (BUD 4: « t'es dans le rush, tu ajoutes une
 * dépense après avoir commandé au grec »): the one form of a spend, its
 * project or artist chosen in it (the last ones first), already paid by
 * default. On the Dépenses pages; from every page, the shell's « + ».
 */
export function QuickExpenseButton({
  outline = false,
  iconOnly = false,
}: {
  // Among other actions of the same weight (Finance's overview).
  outline?: boolean;
  // « + » alone at the end of a list's tools (Finance › Dépenses, as the
  // proto), its name said by the tooltip and to screen readers.
  iconOnly?: boolean;
}) {
  const t = fr.budget;
  const [open, setOpen] = useState(false);
  return (
    <>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon"
                aria-label={t.add}
                onClick={() => setOpen(true)}
              />
            }
          >
            <IconPlus aria-hidden />
          </TooltipTrigger>
          <TooltipContent side="bottom">{t.add}</TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant={outline ? "outline" : "default"}
          size="lg"
          onClick={() => setOpen(true)}
        >
          <IconPlus aria-hidden data-icon="inline-start" />
          {t.add}
        </Button>
      )}
      <QuickExpenseDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** The quick spend's form in its modal, opened from a button or from
 * Finance's ⌘K (« Ajouter une dépense »). */
export function QuickExpenseDialog({
  open,
  onOpenChange,
  preferredProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The project the reader is on: its target comes first if they may aim
  // at it (the shell's « + »), changeable.
  preferredProjectId?: string;
}) {
  const t = fr.budget;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.form.quickTitle}
      closeLabel={fr.dialogs.close}
    >
      <Loaded
        load={loadExpenseTargets}
        loadingLabel={t.form.loading}
        errorLabel={t.loadError}
      >
        {(data) =>
          data.targets.length === 0 ? (
            <FormMessage kind="info">{t.form.noTargets}</FormMessage>
          ) : (
            <BudgetLineForm
              target={null}
              targets={data.targets}
              line={null}
              initial={{ status: "paid" }}
              organizationId={data.organizationId}
              preferredTargetKey={
                preferredProjectId &&
                data.targets.some(
                  (o) => o.kind === "project" && o.id === preferredProjectId,
                )
                  ? targetKey({ kind: "project", id: preferredProjectId })
                  : undefined
              }
              onDone={() => onOpenChange(false)}
            />
          )
        }
      </Loaded>
    </FormDialog>
  );
}
