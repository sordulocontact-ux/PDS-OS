import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { invoices } from "@/lib/i18n/fr/invoices";
import type { InvoiceExpected, ProjectInvoice } from "@/lib/invoices/types";
import { formatDay, formatShortInstant } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { invoices };

const t = fr.invoices.team;

/** The parts of a rate committed (« mix 800 € · mastering 300 € »). */
export function agreedParts(expected: InvoiceExpected): string {
  if (!expected) return "";
  const e = (c: number) => formatAmount(c, { ht: false });
  return [
    expected.mix != null ? `mix ${e(expected.mix)}` : null,
    expected.mastering != null ? `mastering ${e(expected.mastering)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** What was agreed, in words (« Montant engagé : 1 100 € HT (mix 800 € ·
 * mastering 300 €) », « Montant du contrat : 600 € HT »). */
export function agreedLine(i: ProjectInvoice): string | null {
  if (!i.expected) return null;
  return i.origin === "master"
    ? t.agreed.master(formatAmount(i.expected.total), agreedParts(i.expected))
    : t.agreed.contract(formatAmount(i.expected.total));
}

/** The RIB of a received invoice as this reader may see it: the digits for
 * the direction, its state for the owner. */
function ribRow(i: ProjectInvoice) {
  const bank = i.bank;
  if (bank?.pending)
    return {
      value: `${bank.pending.masked} · ${bank.pending.holder}`,
      source: t.ribChanged(
        bank.pending.by ?? i.contactName,
        formatShortInstant(bank.pending.at),
        bank.current?.masked ?? null,
      ),
      state: { tone: "warning" as const, label: t.states.toConfirm },
      iban: bank.pending.iban,
    };
  if (bank?.current)
    return {
      value: `${bank.current.masked} · ${bank.current.holder}`,
      source: bank.current.by
        ? t.ribConfirmed(bank.current.by, formatShortInstant(bank.current.at))
        : t.ribFirst,
      state: { tone: "success" as const, label: t.states.verified },
      iban: bank.current.iban,
    };
  return {
    value:
      i.bankState === "pending"
        ? t.ribTeamPending
        : i.bankState === "verified"
          ? t.ribTeamVerified
          : t.ribTeamNone,
    source: t.ribTeamSource,
    state:
      i.bankState === "none"
        ? null
        : i.bankState === "pending"
          ? { tone: "warning" as const, label: t.states.toConfirm }
          : { tone: "success" as const, label: t.states.verified },
    iban: null,
  };
}

/**
 * A received invoice, whatever it pays (proto `invoiceBlock`, `invBlock`):
 * the PDF, the amount against what was agreed (the rate, the contract),
 * its due date or its payment, and the RIB.
 */
export function InvoiceCard({ invoice: i }: { invoice: ProjectInvoice }) {
  const conform = i.expected !== null && i.amountCents === i.expected.total;
  const rib = ribRow(i);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-hairline)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <b className="font-semibold break-all">
            {t.card(i.number ?? "", i.contactName)}
          </b>
          <span className="text-[length:var(--type-caption)] break-all text-[color:var(--text-secondary)]">
            {i.viaLink
              ? t.cardMetaLink(
                  i.fileName ?? "",
                  formatShortInstant(i.receivedAt!),
                )
              : t.cardMetaOther(
                  i.fileName ?? "",
                  formatDay(i.receivedOn!),
                  i.receivedBy,
                )}
          </span>
        </div>
        {i.fileUrl && (
          <a
            href={i.fileUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ButtonRoll>{t.pdf}</ButtonRoll>
          </a>
        )}
      </div>
      <FactRows>
        <FactRow
          label={t.amount}
          value={
            <b className="font-semibold">{formatAmount(i.amountCents ?? 0)}</b>
          }
          source={
            !i.expected
              ? t.noEngaged
              : conform
                ? i.origin === "master"
                  ? t.conform.master(agreedParts(i.expected))
                  : t.conform.contract
                : t.gap(
                    i.origin,
                    formatAmount(i.expected.total),
                    i.contactName,
                    i.reason,
                  )
          }
          state={
            i.expected
              ? conform
                ? { tone: "success", label: t.states.conform }
                : { tone: "warning", label: t.states.gap }
              : null
          }
        />
        <FactRow
          label={t.due}
          value={
            i.paidOn
              ? t.paidValue(formatDay(i.paidOn))
              : t.dueValue(formatDay(i.dueOn!))
          }
          source={i.paidOn ? t.paidSource(i.proofName, i.paidBy) : t.dueSource}
          state={
            i.paidOn
              ? { tone: "success", label: t.states.paid }
              : { tone: "info", label: t.states.toPay }
          }
          side={
            i.proofUrl ? (
              <a
                href={i.proofUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <ButtonRoll>{t.proofLink}</ButtonRoll>
              </a>
            ) : undefined
          }
        />
        <FactRow
          label={t.rib}
          value={rib.value}
          source={rib.source}
          state={rib.state}
          below={
            rib.iban && (
              <details className="px-4 pb-3 text-[length:var(--type-body-sm)]">
                <summary className="cursor-pointer text-[color:var(--text-secondary)]">
                  {t.fullIban}
                </summary>
                <span className="font-mono tabular-nums select-all">
                  {rib.iban.replace(/(.{4})/g, "$1 ").trim()}
                </span>
              </details>
            )
          }
        />
      </FactRows>
    </div>
  );
}
