"use client";

import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { DialogButton } from "@/components/ui/dialog-button";
import { invoices } from "@/lib/i18n/fr/invoices";
import type { ProjectInvoice, ProjectInvoicesView } from "@/lib/invoices/types";
import { invoiceAnchor } from "@/lib/invoices/href";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

import { agreedLine, InvoiceCard } from "./invoice-card";
import { InvoiceForm } from "./invoice-form";
import { PayForm } from "./pay-form";
import { RibConfirmForm } from "./rib-confirm-form";

const fr = { invoices };

const t = fr.invoices.team;

/**
 * One invoice of an external person in the team's step, whatever it pays
 * (the engineer's at the Master final, a contract's in the person's step of
 * the Juridique): asked — « Ajouter une facture reçue autrement » for the
 * owner or the direction; received — the card, then the new RIB to confirm
 * by phone and « Marquer comme payée » for the direction, a callout for
 * the others. Never a transfer by PDS OS; never a blocker.
 */
export function InvoicePanel({
  projectId,
  invoice: i,
  view,
}: {
  projectId: string;
  invoice: ProjectInvoice;
  view: Pick<ProjectInvoicesView, "isDirection" | "canAdd" | "direction">;
}) {
  const direction = view.direction ?? t.direction;
  if (!i.receivedAt)
    return (
      <div
        id={invoiceAnchor(i.id)}
        className="flex scroll-mt-24 flex-col gap-2.5"
      >
        <FactRows>
          <FactRow
            label={t.of(i.contactName)}
            value={t.expected}
            source={t.expectedSource(
              agreedLine(i),
              formatShortInstant(i.requestedAt),
            )}
            state={{ tone: "warning", label: t.expected }}
          />
        </FactRows>
        <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
          {i.canEmail ? t.emailed(i.contactName) : t.noEmail(i.contactName)}
        </p>
        {view.canAdd && (
          // A gesture that asks for something opens a dialog (proto v3).
          <DialogButton
            label={t.other}
            variant="outline"
            size="sm"
            title={t.other}
            description={t.otherHint}
          >
            {() => (
              <InvoiceForm
                target={{ kind: "team", invoiceId: i.id, projectId }}
                expectedCents={i.expected?.total ?? null}
                holder={i.contactName}
                rib={
                  i.bankState === "none"
                    ? null
                    : {
                        value:
                          i.bankState === "pending"
                            ? t.ribTeamPending
                            : t.ribTeamVerified,
                        source: t.ribTeamSource,
                      }
                }
              />
            )}
          </DialogButton>
        )}
      </div>
    );
  return (
    <div id={invoiceAnchor(i.id)} className="flex scroll-mt-24 flex-col gap-3">
      <InvoiceCard invoice={i} />
      {!i.paidOn &&
        (i.bankState === "pending" ? (
          view.isDirection && i.bank?.pending ? (
            <RibConfirmForm
              projectId={projectId}
              accountId={i.bank.pending.id}
              name={i.contactName}
            />
          ) : (
            <ToneCallout tone="info">
              {t.waitConfirm(direction, i.contactName)}
            </ToneCallout>
          )
        ) : view.isDirection ? (
          <DialogButton
            label={t.pay}
            size="sm"
            title={t.payTitle}
            description={t.payNote}
          >
            {() => (
              <PayForm
                projectId={projectId}
                invoiceId={i.id}
                receivedOn={i.receivedOn!}
              />
            )}
          </DialogButton>
        ) : (
          <ToneCallout tone="info">
            {t.waitPay(direction, i.contactName, formatDay(i.dueOn!))}
          </ToneCallout>
        ))}
    </div>
  );
}
