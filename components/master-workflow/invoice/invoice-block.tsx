import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { eurosHt } from "@/lib/master-workflow/invoice-rules";
import type {
  MasterInvoicesView,
  TeamInvoice,
} from "@/lib/master-workflow/invoices";
import { budgetStatusTone } from "@/lib/ui/state-tones";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

import { engagedParts, InvoiceCard } from "./invoice-card";
import { InvoiceForm } from "./invoice-form";
import { PayForm } from "./pay-form";
import { RibConfirmForm } from "./rib-confirm-form";

const t = fr.masterInvoice;
const h3 =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

/**
 * « Facture et paiement » (« À payer » for the direction) at the bottom of
 * the Master final (proto `payBlock`): each external engineer's invoice,
 * expected or received; the new RIB to confirm by phone, the transfer to
 * note (direction); then the Budget of the Master. The payment never
 * blocks the release.
 */
export function InvoiceBlock({
  projectId,
  view,
  inHouse = false,
}: {
  projectId: string;
  view: MasterInvoicesView;
  // The engineer is a member of PDS: no invoice (proto `payBlock`).
  inHouse?: boolean;
}) {
  if (view.invoices.length === 0)
    return inHouse ? (
      <section className="flex flex-col gap-3">
        <h3 className={h3}>{t.team.title}</h3>
        <FactRows>
          <FactRow
            label={t.team.inHouse}
            value={t.team.inHouseValue}
            source={t.team.inHouseSource}
          />
        </FactRows>
      </section>
    ) : null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className={h3}>
        {view.isDirection ? t.team.titleDirection : t.team.title}
      </h3>
      {view.invoices.map((i) => (
        <OneInvoice key={i.id} projectId={projectId} invoice={i} view={view} />
      ))}
      {view.budget.length > 0 && <MasterBudget view={view} />}
    </section>
  );
}

function OneInvoice({
  projectId,
  invoice: i,
  view,
}: {
  projectId: string;
  invoice: TeamInvoice;
  view: MasterInvoicesView;
}) {
  const direction = view.direction ?? t.team.direction;
  if (!i.receivedAt)
    return (
      <div className="flex flex-col gap-2.5">
        <FactRows>
          <FactRow
            label={t.team.of(i.contactName)}
            value={t.team.expected}
            source={t.team.expectedSource(
              i.expected
                ? `${eurosHt(i.expected.total)} (${engagedParts(i.expected)})`
                : null,
              formatShortInstant(i.requestedAt),
            )}
            state={{ tone: "warning", label: t.team.expected }}
          />
        </FactRows>
        <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
          {t.team.noEmail(i.contactName)}
        </p>
        {view.canAddOther && (
          <VersionCard title={t.team.other} meta={t.team.otherHint}>
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
                          ? t.team.ribTeamPending
                          : t.team.ribTeamVerified,
                      source: t.team.ribTeamSource,
                    }
              }
            />
          </VersionCard>
        )}
      </div>
    );
  const receivedOn = todayInParis(new Date(i.receivedAt));
  return (
    <div className="flex flex-col gap-3">
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
              {t.team.waitConfirm(direction, i.contactName)}
            </ToneCallout>
          )
        ) : view.isDirection ? (
          <PayForm
            projectId={projectId}
            invoiceId={i.id}
            receivedOn={receivedOn}
          />
        ) : (
          <ToneCallout tone="info">
            {t.team.waitPay(direction, i.contactName, formatDay(i.dueOn!))}
          </ToneCallout>
        ))}
    </div>
  );
}

/** The Master's budget lines (proto `budgetRows`): from estimated to
 * paid, each state said by the gesture that set it. */
function MasterBudget({ view }: { view: MasterInvoicesView }) {
  const invoiceOf = (stage: "mix" | "mastering") =>
    view.invoices.find((i) => i.receivedAt && i.expected?.[stage] != null);
  return (
    <>
      <h3 className={h3}>{t.budget.title}</h3>
      <FactRows>
        {view.budget.map((line) => {
          const inv = invoiceOf(line.stage);
          const source =
            line.status === "paid" && inv?.paidOn
              ? [t.budget.paid(formatDay(inv.paidOn)), inv.paidBy]
                  .filter(Boolean)
                  .join(" · ")
              : line.status === "invoiced" && inv?.receivedAt
                ? t.budget.invoiced(
                    inv.number ?? "",
                    formatShortInstant(inv.receivedAt),
                    formatDay(inv.dueOn!),
                  )
                : line.status === "committed"
                  ? [line.note, t.budget.committed].filter(Boolean).join(" · ")
                  : line.note;
          return (
            <FactRow
              key={line.stage}
              label={line.label}
              value={eurosHt(line.amountCents)}
              source={source}
              state={{
                tone: budgetStatusTone[line.status] ?? "neutral",
                label:
                  fr.budget.statuses[
                    line.status as keyof typeof fr.budget.statuses
                  ] ?? line.status,
              }}
            />
          );
        })}
      </FactRows>
    </>
  );
}
