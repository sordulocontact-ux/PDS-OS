import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { masterPage } from "@/lib/i18n/fr/master-page";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { legalContracts, legalForms, masterPage };

/** The person's roles, as their credits say them. */
export const rolesOf = (row: Pick<AgreementRow, "creditRoles">) =>
  row.creditRoles.map((r) => fr.masterPage.credits.roles[r]).join(", ") ||
  fr.legalForms.roles.performer;

// One grid for the whole table on a wide screen (Person · Contract · Fee ·
// State), each line taking its columns (subgrid): the header and every line
// share the same widths whatever a state holds (Sacha, 06/11/2026). On a
// phone each line is its own grid: the person and the state share the first
// line, the rest goes under.
const table =
  "flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto_auto] md:gap-x-4";
const line =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 md:col-span-full md:grid-cols-subgrid md:items-center";

/**
 * « Contrats à prévoir » as a table (Sacha, 06/11/2026: « les 3 lignes font
 * trop, on se perd »): one line per person, in columns, where the proposal
 * comes from said once above it by the caller; a second line only for an
 * exception (a justification, a modification, a missing template).
 */
export function ContractTable({ children }: { children: ReactNode }) {
  const t = fr.legalContracts.agreements;
  return (
    <div
      className={cn(
        table,
        "overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card",
      )}
    >
      <div
        aria-hidden
        className={cn(
          line,
          "hidden border-b border-[color:var(--border-hairline)] bg-[var(--surface-soft)] px-3.5 py-2 text-caption text-[color:var(--text-tertiary)] md:grid modern:px-4",
        )}
      >
        <span>{t.columns.person}</span>
        <span>{t.plan.contract}</span>
        <span className="text-right">{t.columns.fee}</span>
        <span className="text-right">{t.columns.state}</span>
      </div>
      {children}
    </div>
  );
}

/** One person of the table; the whole line opens its fields when
 * `onClick` is given, `open` while they show under it. */
export function ContractTableRow({
  name,
  roles,
  contract,
  fee,
  state,
  note,
  noteTone = "muted",
  action,
  onClick,
  open,
  label,
}: {
  name: string;
  roles: string;
  contract: ReactNode;
  fee: string | null;
  state: { tone: Tone; label: string } | null;
  // The exception, under the contract (justification, modification, error).
  note?: ReactNode;
  noteTone?: "muted" | "selection" | "error";
  // A button beside the state (« Générer », « Ouvrir le contrat »).
  action?: ReactNode;
  onClick?: () => void;
  open?: boolean;
  // What the row's click does, for a screen reader.
  label?: string;
}) {
  const content = (
    <>
      <span className="min-w-0 break-words">
        <span className="font-medium">{name}</span>
        {roles && (
          <span className="text-[color:var(--text-secondary)]"> · {roles}</span>
        )}
      </span>
      <span className="col-span-2 min-w-0 break-words md:col-span-1">
        {contract}
      </span>
      <span
        className={cn(
          "col-span-2 tabular-nums md:col-span-1 md:text-right",
          !fee && "hidden text-[color:var(--text-muted)] md:inline",
        )}
      >
        {fee ?? "—"}
      </span>
      <span className="col-start-2 row-start-1 flex flex-wrap items-center justify-end gap-2 md:col-start-auto md:row-start-auto">
        {state && (
          <StatusBadge tone={state.tone} size="sm">
            {state.label}
          </StatusBadge>
        )}
        {action}
      </span>
      {note && (
        <span
          className={cn(
            "col-span-2 text-caption break-words md:col-span-3 md:col-start-2",
            noteTone === "selection" && "text-[color:var(--selection)]",
            noteTone === "error" && "font-semibold text-error",
            noteTone === "muted" && "text-[color:var(--text-tertiary)]",
          )}
        >
          {note}
        </span>
      )}
    </>
  );
  const frame = cn(
    line,
    "w-full border-b border-[color:var(--border-hairline)] px-3.5 modern:px-4 py-2.75 modern:py-3 text-left text-body-sm last:border-b-0",
    // Open: light grey, never blue (docs/DESIGN.md § 3 bis, 09/11/2026).
    open && "bg-[var(--surface-sunken)]",
  );
  if (!onClick) return <div className={frame}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        frame,
        "cursor-pointer outline-none [transition:var(--transition-control)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]",
        !open && "hover:bg-[var(--control-bg-hover)]",
      )}
    >
      {label && <span className="sr-only">{label}</span>}
      {content}
    </button>
  );
}

/** The fields of an open row, under it, in the same frame. */
export function ContractTableEditor({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 border-b border-[color:var(--border-hairline)] bg-[var(--surface-soft)] px-3.5 py-3.5 last:border-b-0 md:col-span-full modern:gap-4 modern:px-4 modern:py-4">
      {children}
    </div>
  );
}
