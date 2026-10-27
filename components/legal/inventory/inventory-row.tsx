import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FactStatus } from "@/lib/facts/types";
import { legal } from "@/lib/i18n/fr/legal";
import { factTone } from "@/lib/ui/state-tones";

const fr = { legal };

/**
 * One fact of the État des lieux: what it is on the left, its source, its
 * precise state as a badge and its action on the right (the prototype's
 * `.row`, a soft block instead of a hairline).
 */
export function InventoryRow({
  label,
  statusLabel,
  detail,
  source,
  status,
  href,
  children,
}: {
  label: string;
  statusLabel: string;
  // Detail and the title it concerns, already joined; empty when none.
  detail: string | null;
  source: string;
  status: FactStatus;
  href: string | null;
  // The row's own controls; replace the default « Compléter » / « Voir ».
  children?: React.ReactNode;
}) {
  const t = fr.legal.inventory.actions;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-[var(--surface-soft)] px-3.5 py-2.5">
      <div className="flex min-w-0 flex-col">
        <span className="text-body-md break-words">
          <b>{label}</b>
        </span>
        {detail && (
          <span className="text-caption break-words text-muted-foreground">
            {detail}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <span className="text-caption text-muted-foreground">{source}</span>
        <StatusBadge size="sm" tone={factTone[status]}>
          {statusLabel}
        </StatusBadge>
        {children ??
          (href && (
            <Link
              href={href}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {status === "known" ? t.view : t.complete}
            </Link>
          ))}
      </div>
    </li>
  );
}
