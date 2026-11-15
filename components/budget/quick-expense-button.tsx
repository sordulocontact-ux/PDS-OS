"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { BudgetLineForm } from "@/components/budget/budget-line-form";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { loadExpenseTargets } from "@/lib/budget/target-actions";
import { budget } from "@/lib/i18n/fr/budget";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { budget, dialogs };

/**
 * « + Dépense » (BUD 4: « t'es dans le rush, tu ajoutes une dépense après
 * avoir commandé au grec »): the one form of a spend, its project or artist
 * chosen in it (the last ones first), already paid by default. In the
 * phone's header on every page (`compact`), on the Dépenses page otherwise.
 */
export function QuickExpenseButton({
  compact = false,
  outline = false,
}: {
  compact?: boolean;
  // Among other actions of the same weight (Finance's overview).
  outline?: boolean;
}) {
  const t = fr.budget;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={compact || outline ? "outline" : "default"}
        size={compact ? "sm" : "lg"}
        aria-label={compact ? t.quickAddLabel : undefined}
        onClick={() => setOpen(true)}
      >
        <IconPlus aria-hidden data-icon="inline-start" />
        {compact ? t.quickAdd : t.add}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.form.quickTitle}
        description={t.form.quickDescription}
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
                onDone={() => setOpen(false)}
              />
            )
          }
        </Loaded>
      </FormDialog>
    </>
  );
}
