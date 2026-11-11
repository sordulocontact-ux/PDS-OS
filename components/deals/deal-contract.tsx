"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { linkDealContract } from "@/lib/deals/memo-actions";
import type { DealContract as Contract } from "@/lib/deals/memos";
import { contracts } from "@/lib/i18n/fr/contracts";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { contractStateTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { contracts, dealMemos, dialogs };
const t = fr.dealMemos.contract;

function LinkForm({
  dealId,
  current,
  options,
  onDone,
}: {
  dealId: string;
  current: string | null;
  options: Record<string, string>;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.linked);
  const [missing, setMissing] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const picked = String(
          new FormData(event.currentTarget).get("contract") ?? "",
        );
        setMissing(!picked);
        if (picked) run(() => linkDealContract(dealId, picked));
      }}
    >
      <OptionSelect
        id={`deal-${dealId}-contract`}
        name="contract"
        label={t.pick}
        placeholder={t.pickPlaceholder}
        required
        items={options}
        defaultValue={current}
        error={missing ? t.pickPlaceholder : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/**
 * The deal's contract (BIZ 7): a participation's deal shows the
 * participation's (never copied); any other deal names one main contract
 * among those of its project or artist (« Lier un contrat », « Changer »,
 * « Retirer le lien »). Its name opens it in Contrats for whoever may.
 */
export function DealContract({
  dealId,
  participation,
  contract,
  options,
}: {
  dealId: string;
  participation: boolean;
  contract: Contract | null;
  // The contracts it may name, for whoever writes it; null otherwise.
  options: Record<string, string> | null;
}) {
  const [open, setOpen] = useState(false);
  const unlink = useWriteSubmit(undefined, t.unlinked);
  const canLink = !participation && options !== null;
  const empty = Object.keys(options ?? {}).length === 0;
  const linkButton = canLink && (
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
      {contract ? t.change : t.link}
    </Button>
  );

  return (
    <>
      {contract ? (
        <FactRows>
          <FactRow
            label={
              contract.source === "participation"
                ? t.fromParticipation
                : fr.contracts.types[
                    contract.type as keyof typeof fr.contracts.types
                  ]
            }
            value={contract.title}
            state={{
              tone: contractStateTone[contract.status] ?? "neutral",
              label:
                fr.contracts.states[
                  contract.status as keyof typeof fr.contracts.states
                ] ?? contract.status,
            }}
            source={
              contract.signedOn
                ? t.signedOn(formatDay(contract.signedOn))
                : null
            }
            href={contract.visible ? routes.contract(contract.id) : null}
            hrefLabel={t.open(contract.title)}
            side={
              canLink ? (
                <div className="flex items-center gap-2">
                  {linkButton}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={unlink.pending}
                    onClick={() =>
                      unlink.run(() => linkDealContract(dealId, null))
                    }
                  >
                    {t.unlink}
                  </Button>
                </div>
              ) : null
            }
          />
          {contract.amountCents !== null && (
            <FactRow
              label={t.amount}
              value={formatAmount(contract.amountCents)}
            />
          )}
        </FactRows>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <EmptyNote>{participation ? t.noneParticipation : t.none}</EmptyNote>
          {canLink &&
            (empty ? <EmptyNote>{t.noOption}</EmptyNote> : linkButton)}
        </div>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.linkTitle}
        description={t.linkDescription}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <LinkForm
            dealId={dealId}
            current={contract?.source === "deal" ? contract.id : null}
            options={options ?? {}}
            onDone={() => setOpen(false)}
          />
        )}
      </FormDialog>
    </>
  );
}
