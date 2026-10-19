"use client";

import { useState } from "react";

import { InvoiceAddForm } from "@/components/legal/invoices/invoice-add-form";
import { InvoicePaidForm } from "@/components/legal/invoices/invoice-paid-form";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { formatFee } from "@/lib/legal/contracts/fields";
import type {
  ContractInvoice,
  InvoiceState,
} from "@/lib/legal/invoices/queries";
import type { Tone } from "@/lib/ui/state-tones";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

const t = fr.legalInvoices;
const TONE: Record<InvoiceState, Tone> = {
  asked: "warning",
  to_pay: "info",
  paid: "success",
};

/**
 * The invoice of a person paid by their signed contract, in their step
 * (proto « Projet complet », legal:invoice): what is awaited and from whom;
 * for the direction only, the invoice (number, file, amount against the
 * fee agreed, due date) and « Marquer comme payée » with its proof — or
 * « Ajouter une facture reçue autrement ». Never a transfer by PDS OS.
 */
export function InvoiceBlock({
  projectId,
  personName,
  data,
  canValidate,
  direction,
}: {
  projectId: string;
  personName: string;
  data: ContractInvoice;
  canValidate: boolean;
  direction: string;
}) {
  const [adding, setAdding] = useState(false);
  const expected = formatFee(data.amountCents);
  const v = data.invoice;
  const head = (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="font-semibold">{t.title}</h3>
      <StatusBadge tone={TONE[data.state]} size="sm">
        {t.states[data.state]}
      </StatusBadge>
    </div>
  );

  if (data.state === "asked")
    return (
      <section className="flex flex-col gap-3">
        {head}
        <ToneCallout tone="info">
          {t.waitingPerson(personName, expected)}
        </ToneCallout>
        {canValidate &&
          (adding ? (
            <InvoiceAddForm
              projectId={projectId}
              needId={data.needId}
              expectedCents={data.amountCents}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setAdding(true)}
            >
              {t.addOther}
            </Button>
          ))}
      </section>
    );

  // The Juridique sees where it stands; the direction, the invoice.
  if (!canValidate || !v)
    return (
      <section className="flex flex-col gap-3">
        {head}
        <ToneCallout tone={data.state === "paid" ? "success" : "info"}>
          {data.state === "paid"
            ? t.states.paid
            : t.waitingDirection(direction)}
        </ToneCallout>
      </section>
    );

  const gap = v.amountCents !== data.amountCents;
  const link = (url: string | null) =>
    url && (
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<a href={url} target="_blank" rel="noopener noreferrer" />}
      >
        {t.pdf}
      </Button>
    );
  return (
    <section className="flex flex-col gap-3">
      {head}
      <FactRows>
        <FactRow
          label={t.invoice}
          value={t.invoiceValue(v.number, v.fileName)}
          source={
            v.via === "link"
              ? t.byLink(personName, formatShortInstant(v.createdAt))
              : t.byTeam(v.addedBy ?? "—", formatDay(v.receivedOn))
          }
          side={link(v.fileUrl)}
        />
        <FactRow
          label={t.amount}
          value={t.ht(formatFee(v.amountCents))}
          source={
            gap
              ? t.gapSource(expected, personName, v.gapReason ?? "")
              : t.sameAmount
          }
          state={gap ? { tone: "warning", label: t.gap } : null}
        />
        <FactRow
          label={t.due}
          value={formatDay(v.dueOn)}
          source={t.dueSource}
        />
      </FactRows>
      {v.paid ? (
        <ToneCallout tone="success">
          {t.paid(formatDay(v.paid.on), v.paid.by, v.paid.proof)}
        </ToneCallout>
      ) : (
        <InvoicePaidForm
          projectId={projectId}
          needId={data.needId}
          invoiceId={v.id}
        />
      )}
    </section>
  );
}
