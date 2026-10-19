import { buttonVariants } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import { eurosHt } from "@/lib/master-workflow/invoice-rules";
import type { TeamInvoice } from "@/lib/master-workflow/invoices";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

const t = fr.masterInvoice.team;

/** The parts of the rate committed (« mix 800 € · mastering 300 € »). */
export function engagedParts(expected: TeamInvoice["expected"]): string {
  if (!expected) return "";
  const e = (c: number) => eurosHt(c).replace(" HT", "");
  return [
    expected.mix !== null ? `mix ${e(expected.mix)}` : null,
    expected.mastering !== null ? `mastering ${e(expected.mastering)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** A received invoice (proto `invoiceBlock`): the PDF, the amount against
 * the rate committed, its due date, and the RIB as this reader may see it
 * (the digits for the direction, the state for the owner). */
export function InvoiceCard({ invoice: i }: { invoice: TeamInvoice }) {
  const conform = i.expected !== null && i.amountCents === i.expected.total;
  const bank = i.bank;
  const rib = bank
    ? bank.pending
      ? {
          value: `${bank.pending.masked} · ${bank.pending.holder}`,
          source: t.ribChanged(
            bank.pending.by ?? i.contactName,
            formatShortInstant(bank.pending.at),
            bank.current?.masked ?? null,
          ),
          state: { tone: "warning" as const, label: t.states.toConfirm },
          iban: bank.pending.iban,
        }
      : bank.current
        ? {
            value: `${bank.current.masked} · ${bank.current.holder}`,
            source: bank.current.by
              ? t.ribConfirmed(
                  bank.current.by,
                  formatShortInstant(bank.current.at),
                )
              : t.ribFirst,
            state: { tone: "success" as const, label: t.states.verified },
            iban: bank.current.iban,
          }
        : null
    : {
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
                  formatShortInstant(i.receivedAt!),
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
            {t.pdf}
          </a>
        )}
      </div>
      <FactRows>
        <FactRow
          label={t.amount}
          value={<b className="font-semibold">{eurosHt(i.amountCents ?? 0)}</b>}
          source={
            !i.expected
              ? t.noEngaged
              : conform
                ? t.conform(engagedParts(i.expected))
                : t.gap(eurosHt(i.expected.total), i.reason)
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
        />
        {rib && (
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
        )}
      </FactRows>
    </div>
  );
}
