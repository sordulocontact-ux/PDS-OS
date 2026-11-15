"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { attachProof } from "@/lib/finance/proof-gestures";
import type { SpendRef } from "@/lib/finance/proof-view";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = financeReceipts.actions;

const spendOption = (s: SpendRef) =>
  [
    s.label,
    formatAmount(s.cents, { ht: false }),
    formatDay(s.day, { weekday: false }),
  ].join(" · ");

/**
 * « Choisir une autre dépense »: any spend still without a proof, found by
 * its label, envelope, amount or day, then « Rattacher à cette dépense ».
 * In the sheet, under the proposal.
 */
export function ReceiptChooseForm({
  proofId,
  choices,
}: {
  proofId: string;
  choices: SpendRef[];
}) {
  const [chosen, setChosen] = useState("");
  const submit = useWriteSubmit(undefined, financeReceipts.attached);
  const byId = new Map(choices.map((s) => [s.id, s]));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proof-spend">{t.spendLabel}</Label>
        <SearchSelect
          id="proof-spend"
          label={t.spendLabel}
          fill
          options={Object.fromEntries(
            choices.map((s) => [s.id, spendOption(s)]),
          )}
          value={chosen}
          onChange={setChosen}
          placeholder={t.spendPlaceholder}
          searchPlaceholder={t.spendSearch}
          emptyLabel={t.spendEmpty}
          badge={(id) => byId.get(id)?.envelope}
          keywords={(id) => byId.get(id)?.envelope ?? ""}
        />
      </div>
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={submit.pending}
          onClick={() =>
            chosen
              ? submit.run(() => attachProof(proofId, chosen))
              : submit.setError(t.spendMissing)
          }
        >
          {t.attachChosen}
        </Button>
      </div>
    </div>
  );
}
