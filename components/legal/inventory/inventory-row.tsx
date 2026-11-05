import { InventoryEditRow } from "@/components/legal/inventory/inventory-edit-row";
import { RecordPeekRow } from "@/components/shell/record-peek-row";
import { FactRow } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FactGroup, FactStatus } from "@/lib/facts/types";
import type { LegalRowEdit } from "@/lib/legal/types";
import type { PeekTarget } from "@/lib/peek/types";
import { factTone } from "@/lib/ui/state-tones";

/**
 * One fact of the État des lieux, as every fact of a step (`FactRow`, proto
 * Juridique v3 `fact()`): what it is, what it concerns and its source under
 * it, its state as a pill. The title is a tag only when the project has
 * several (`group`), never repeated in the line. As in the Master, a click
 * on the whole row does what the row offers, with no « Voir » / « Compléter »
 * written on it (Sacha, 05/11/2026): `edit` opens its form in a modal of the
 * page; else `peek` previews its record in a modal; else `href` opens its
 * page. A row with its own buttons (`children`: « Ajouter au Réseau »,
 * « Lier ») is not clickable itself.
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
  peek,
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
  peek?: PeekTarget;
  children?: React.ReactNode;
}) {
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
  const row = {
    value: label,
    source: [detail, source].filter(Boolean).join(" · "),
    state: statusLabel ? { tone: factTone[status], label: statusLabel } : null,
  };
  if (children)
    return (
      <FactRow
        {...row}
        side={
          <>
            {tag}
            {children}
          </>
        }
      />
    );
  if (edit)
    return (
      <InventoryEditRow
        {...row}
        action={edit}
        missing={status === "missing"}
        hrefLabel={label}
        side={tag}
      />
    );
  if (peek)
    return (
      <RecordPeekRow
        {...row}
        target={peek}
        name={label}
        hrefLabel={label}
        side={tag}
      />
    );
  return <FactRow {...row} side={tag} href={href} hrefLabel={label} />;
}
