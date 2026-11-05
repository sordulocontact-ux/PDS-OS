import { InventoryEditRow } from "@/components/legal/inventory/inventory-edit-row";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { FactRow } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import type { FactGroup, FactStatus } from "@/lib/facts/types";
import { legal } from "@/lib/i18n/fr/legal";
import type { LegalRowEdit } from "@/lib/legal/types";
import { factTone } from "@/lib/ui/state-tones";

const fr = { legal };

/**
 * One fact of the État des lieux, as every fact of a step (`FactRow`, proto
 * Juridique v3 `fact()`): what it is, what it concerns and its source under
 * it, its state as a pill and its action on the right. The title is a tag
 * only when the project has several (`group`), never repeated in the line.
 * `edit`: the whole row opens its form in a modal on the page (Sacha,
 * 05/11/2026), as the Master edits a fact where it is read.
 */
export function InventoryRow({
  label,
  statusLabel,
  detail,
  source,
  status,
  href,
  group,
  edit,
  children,
}: {
  label: string;
  // Null for a row without a state (an intervenant non crédité).
  statusLabel: string | null;
  detail: string | null;
  source: string;
  status: FactStatus;
  href: string | null;
  group?: FactGroup;
  edit?: LegalRowEdit;
  // The row's own controls; replace the default « Compléter » / « Voir ».
  children?: React.ReactNode;
}) {
  const t = fr.legal.inventory.actions;
  const tag = group && (
    <StatusBadge
      size="sm"
      tone={group.hue}
      title={group.artists || undefined}
      className="max-w-48 truncate"
    >
      {group.title}
    </StatusBadge>
  );
  const sourceLine = [detail, source].filter(Boolean).join(" · ");
  const state = statusLabel
    ? { tone: factTone[status], label: statusLabel }
    : null;
  if (edit)
    return (
      <InventoryEditRow
        action={edit}
        missing={status === "missing"}
        label={undefined}
        hrefLabel={label}
        value={label}
        source={sourceLine}
        state={state}
        side={tag}
      />
    );
  const action =
    children ??
    (href && (
      <ViewLink
        href={href}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ButtonRoll>{status === "known" ? t.view : t.complete}</ButtonRoll>
      </ViewLink>
    ));
  return (
    <FactRow
      value={label}
      source={sourceLine}
      state={state}
      side={
        (tag || action) && (
          <>
            {tag}
            {action}
          </>
        )
      }
    />
  );
}
