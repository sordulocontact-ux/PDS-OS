"use client";

import { IconPenWriting2, IconXmark } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import {
  DealContractCreate,
  type DealContractDefaults,
} from "@/components/deals/deal-contract-create";
import { ContractDepositButton } from "@/components/contracts/contract-deposit-button";
import { DealContractGenerate } from "@/components/deals/deal-contract-generate";
import { IconExternalLink } from "@/components/icons";
import { EmptyNote } from "@/components/shell/empty-state";
import { IconAction } from "@/components/ui/icon-action";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { DocumentCard } from "@/components/ui/document-card";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
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
 * « Retirer le lien »). A document card (Sacha 20/11/2026, proto « Fiche
 * d'un deal » v2): its kind, signature day and amount entered under its
 * name, its state and « Ouvrir » (in Contrats, for whoever may) on the right.
 */
export function DealContract({
  dealId,
  participation,
  contract,
  options,
  create = null,
  document = null,
  deposit = null,
}: {
  dealId: string;
  participation: boolean;
  contract: Contract | null;
  // The contracts it may name, for whoever writes it; null otherwise.
  options: Record<string, string> | null;
  // « Créer le contrat », for whoever creates contracts (Sacha 22/11/2026).
  create?: DealContractDefaults | null;
  // Its PDF (the latest draft or signed copy), to open from the deal.
  // `pdfHref`: a contract generated from a template, printed on demand.
  document?: {
    name: string;
    openUrl: string | null;
    pdfHref?: string;
  } | null;
  // The organization, for whoever may deposit its PDF.
  deposit?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unlink = useWriteSubmit(undefined, t.unlinked);
  const canLink = !participation && options !== null;
  const empty = Object.keys(options ?? {}).length === 0;
  const linkButton = canLink && (
    <Button
      variant="outline"
      size="sm"
      className="self-start"
      onClick={() => setOpen(true)}
    >
      {contract ? t.change : t.link}
    </Button>
  );

  return (
    <>
      {contract ? (
        <DocumentCard
          name={contract.title}
          line={[
            contract.source === "participation"
              ? t.fromParticipation
              : fr.contracts.types[
                  contract.type as keyof typeof fr.contracts.types
                ],
            contract.signedOn ? t.signedOn(formatDay(contract.signedOn)) : null,
            contract.amountCents !== null
              ? `${t.amount} : ${formatAmount(contract.amountCents)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          action={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge
                tone={contractStateTone[contract.status] ?? "neutral"}
                size="sm"
              >
                {fr.contracts.states[
                  contract.status as keyof typeof fr.contracts.states
                ] ?? contract.status}
              </StatusBadge>
              {/* The secondary gestures as icons, the main one last, at the
                  right: open its PDF, or deposit it (Sacha 22/11/2026). */}
              {contract.visible && (
                <IconAction
                  label={t.open(contract.title)}
                  icon={IconExternalLink}
                  size="icon-sm"
                  onClick={() => router.push(routes.contract(contract.id))}
                />
              )}
              {canLink && (
                <IconAction
                  label={t.change}
                  icon={IconPenWriting2}
                  size="icon-sm"
                  onClick={() => setOpen(true)}
                />
              )}
              {canLink && (
                <IconAction
                  label={t.unlink}
                  icon={IconXmark}
                  variant="ghost"
                  size="icon-sm"
                  disabled={unlink.pending}
                  onClick={() =>
                    unlink.run(() => linkDealContract(dealId, null))
                  }
                />
              )}
              {document?.pdfHref ? (
                // Shown in the browser's tab, never downloaded (Sacha
                // 22/11/2026: « on voudrait juste l'ouvrir »).
                <Button
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={`${document.pdfHref}?view=1`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  {t.openPdf}
                </Button>
              ) : document?.openUrl ? (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={document.openUrl}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  aria-label={`${t.openPdf} · ${document.name}`}
                >
                  {t.openPdf}
                </Button>
              ) : (
                deposit && (
                  <ContractDepositButton
                    organizationId={deposit}
                    contractId={contract.id}
                  />
                )
              )}
            </span>
          }
        />
      ) : (
        <EmptyNote
          action={
            (create || (canLink && !empty)) && (
              <span className="flex flex-wrap justify-center gap-2">
                {canLink && !empty && linkButton}
                {create && !participation && (
                  <>
                    <DealContractCreate
                      dealId={dealId}
                      defaults={create}
                      label={t.import}
                    />
                    {/* The main gesture here (Sacha 22/11/2026). */}
                    <DealContractGenerate dealId={dealId} />
                  </>
                )}
              </span>
            )
          }
        >
          {participation ? t.noneParticipation : t.none}
        </EmptyNote>
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
