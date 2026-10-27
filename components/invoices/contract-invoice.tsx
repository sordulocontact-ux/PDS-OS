import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { invoices } from "@/lib/i18n/fr/invoices";
import type { InvoiceStateRow } from "@/lib/invoices/states";
import {
  invoiceState,
  type InvoiceState,
  type ProjectInvoice,
  type ProjectInvoicesView,
} from "@/lib/invoices/types";
import type { Tone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

import { InvoicePanel } from "./invoice-panel";

const fr = { invoices };

const t = fr.invoices;
const TONE: Record<InvoiceState, Tone> = {
  requested: "warning",
  rib: "danger",
  to_pay: "info",
  paid: "success",
};

/** The contracts' invoices of a step, by contract id, and who reads them. */
export type ContractInvoices = {
  byContract: Record<string, ContractInvoiceData>;
  view: Pick<ProjectInvoicesView, "isDirection" | "canAdd" | "direction">;
};

export type ContractInvoiceData = {
  // Read by the owner and the direction (RLS)…
  invoice: ProjectInvoice | null;
  // …where it stands, for the Juridique who does not read it.
  state: InvoiceStateRow | null;
};

/**
 * « Facture » in a person's step of the Juridique, once their paid
 * contract is signed (proto « Projet complet », invBlock): its state, then
 * the one invoice panel of the app for who reads it, or where it stands for
 * who only follows it.
 */
export function ContractInvoice({
  projectId,
  personName,
  data,
  view,
}: {
  projectId: string;
  personName: string;
  data: ContractInvoiceData;
  view: Pick<ProjectInvoicesView, "isDirection" | "canAdd" | "direction">;
}) {
  const state: InvoiceState | null = data.invoice
    ? invoiceState(data.invoice)
    : data.state
      ? data.state.state === "asked"
        ? "requested"
        : data.state.state
      : null;
  if (!state) return null;
  const direction = view.direction ?? t.team.direction;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{t.team.heading}</h3>
        <StatusBadge tone={TONE[state]} size="sm">
          {t.states[state]}
        </StatusBadge>
      </div>
      {data.invoice ? (
        <InvoicePanel
          projectId={projectId}
          invoice={data.invoice}
          view={view}
        />
      ) : (
        <ToneCallout tone={state === "paid" ? "success" : "info"}>
          {state === "requested"
            ? t.team.stateOnly.requested(personName)
            : state === "paid"
              ? t.team.stateOnly.paid(
                  data.state?.paidOn ? formatDay(data.state.paidOn) : "—",
                )
              : t.team.stateOnly.to_pay(direction)}
        </ToneCallout>
      )}
    </section>
  );
}
