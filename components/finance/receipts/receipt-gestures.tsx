"use client";

import dynamic from "next/dynamic";
import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { IconBan } from "@/components/icons";
import { ReceiptCheckForm } from "@/components/finance/receipts/receipt-check-form";
import { ReceiptChooseForm } from "@/components/finance/receipts/receipt-choose-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { attachProof, dismissProof } from "@/lib/finance/proof-gestures";
import type { ProofRow, SpendRef } from "@/lib/finance/proof-view";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { financeSheet } from "@/lib/i18n/fr/finance-home";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";

// The spend form is heavy and rarely opened.
const ReceiptNewSpend = dynamic(() =>
  import("@/components/finance/receipts/receipt-new-spend").then(
    (m) => m.ReceiptNewSpend,
  ),
);

const t = financeReceipts;

/**
 * What a person does with a proof, in its sheet: « Vérifier les valeurs »,
 * « Rattacher » to the proposal, « Choisir une autre dépense », « Créer la
 * dépense », « Écarter » (with why), « Remettre à traiter ». At most two
 * text buttons, the rest in « ⋯ ». Who only reads Finance sees none.
 */
export function ReceiptGestures({
  row,
  choices,
}: {
  row: ProofRow;
  choices: SpendRef[];
}) {
  const [dialog, setDialog] = useState<"check" | "create" | null>(null);
  const [choosing, setChoosing] = useState(false);
  const attach = useWriteSubmit(undefined, t.attached);
  const restore = useWriteSubmit(undefined, t.dismiss.restored);
  const { proof, state } = row;
  const best = row.matches[0];
  const close = () => setDialog(null);
  const more: RowAction[] = [];
  if (state === "proposed" && best)
    more.push({
      key: "create",
      label: t.actions.create,
      icon: IconPlus,
      onSelect: () => setDialog("create"),
    });
  more.push({
    key: "dismiss",
    label: t.actions.dismiss,
    icon: IconBan,
    dialog: {
      title: t.dismiss.title,
      description: t.dismiss.description,
      body: (closeDialog) => (
        <ReasonForm
          label={t.dismiss.reason}
          submitLabel={t.dismiss.save}
          doneMessage={t.dismiss.saved}
          run={(reason) => dismissProof(proof.id, reason)}
          onDone={closeDialog}
        />
      ),
    },
  });

  if (state === "dismissed")
    return (
      <div>
        <Button
          variant="outline"
          disabled={restore.pending}
          onClick={() => restore.run(() => dismissProof(proof.id, null))}
        >
          {t.actions.restore}
        </Button>
      </div>
    );
  if (state === "attached" || state === "reading") return null;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label={financeSheet.actions}
        className="flex flex-wrap items-center gap-2"
      >
        {state === "toCheck" && (
          <Button onClick={() => setDialog("check")}>{t.sheet.check}</Button>
        )}
        {state === "proposed" && best && (
          <Button
            disabled={attach.pending}
            onClick={() =>
              attach.run(() => attachProof(proof.id, best.spend.id))
            }
          >
            {t.actions.attach}
          </Button>
        )}
        {state !== "toCheck" && !(state === "proposed" && best) && (
          <Button onClick={() => setDialog("create")}>
            {t.actions.create}
          </Button>
        )}
        {state !== "toCheck" && (
          <Button variant="outline" onClick={() => setChoosing(!choosing)}>
            {t.actions.other}
          </Button>
        )}
        {/* Never three text buttons (docs/DESIGN.md, « Rangée de
            boutons »): the rest is in « ⋯ ». */}
        <RowActions label={t.actions.more} size="icon-lg" actions={more} />
      </div>
      {attach.error && (
        <p className="text-caption text-[color:var(--tone-danger-fg)]">
          {attach.error}
        </p>
      )}
      {choosing && state !== "toCheck" && (
        <ReceiptChooseForm proofId={proof.id} choices={choices} />
      )}
      <FormDialog
        open={dialog === "check"}
        onOpenChange={(next) => !next && close()}
        title={t.check.title}
        description={t.check.description}
        closeLabel={dialogs.close}
      >
        <ReceiptCheckForm proof={proof} onDone={close} />
      </FormDialog>
      {dialog === "create" && (
        <ReceiptNewSpend
          proof={proof}
          open
          onOpenChange={(next) => !next && close()}
        />
      )}
    </div>
  );
}
