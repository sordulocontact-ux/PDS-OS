import { buttonVariants } from "@/components/ui/button";
import { FactRow } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import type { FactGroup, FactStatus } from "@/lib/facts/types";
import { legal } from "@/lib/i18n/fr/legal";
import { factTone } from "@/lib/ui/state-tones";

const fr = { legal };

/**
 * One fact of the État des lieux, as every fact of a step (`FactRow`, proto
 * Juridique v3 `fact()`): what it is, what it concerns and its source under
 * it, its state as a pill and its action on the right. The title is a tag
 * only when the project has several (`group`), never repeated in the line.
 */
export function InventoryRow({
  label,
  statusLabel,
  detail,
  source,
  status,
  href,
  group,
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
  // The row's own controls; replace the default « Compléter » / « Voir ».
  children?: React.ReactNode;
}) {
  const t = fr.legal.inventory.actions;
  const action =
    children ??
    (href && (
      <ViewLink
        href={href}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        {status === "known" ? t.view : t.complete}
      </ViewLink>
    ));
  return (
    <FactRow
      value={label}
      source={[detail, source].filter(Boolean).join(" · ")}
      state={
        statusLabel ? { tone: factTone[status], label: statusLabel } : null
      }
      side={
        (group || action) && (
          <>
            {group && (
              <StatusBadge
                size="sm"
                tone={group.hue}
                title={group.artists || undefined}
                className="max-w-48 truncate"
              >
                {group.title}
              </StatusBadge>
            )}
            {action}
          </>
        )
      }
    />
  );
}
