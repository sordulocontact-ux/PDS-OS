import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { EnvelopePostRow } from "@/lib/budget/envelope";
import { formatEuros } from "@/lib/budget/types";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { budget } from "@/lib/i18n/fr/budget";
import { envelopeTone } from "@/lib/ui/state-tones";

const fr = { artistBudget, budget };

/**
 * « Par poste » of an artist's envelope (BUD 2): planned, spent and what
 * remains, a poste spent beyond what it was given signalled (never
 * blocking); a poste given nothing draws on the part not allotted.
 */
export function EnvelopePosts({ rows }: { rows: EnvelopePostRow[] }) {
  const t = fr.artistBudget.posts;
  return (
    <DataTable framed>
      <DataTableHeader>
        <DataTableHead fill>{t.poste}</DataTableHead>
        <DataTableHead align="end" hideBelow="sm">
          {t.planned}
        </DataTableHead>
        <DataTableHead align="end">{t.spent}</DataTableHead>
        <DataTableHead align="end" hideBelow="sm">
          {t.rest}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => (
          <DataTableRow key={row.family ?? "none"}>
            <DataTableCell fill>
              <DataTableMedia
                title={
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">
                      {row.family ? fr.budget.families[row.family] : t.none}
                    </span>
                    {row.over && row.restCents !== null && (
                      <StatusBadge tone={envelopeTone.over} size="sm">
                        {t.over(formatEuros(-row.restCents))}
                      </StatusBadge>
                    )}
                  </span>
                }
                subtitle={
                  row.pendingCents > 0
                    ? t.pending(formatEuros(row.pendingCents))
                    : undefined
                }
              />
            </DataTableCell>
            <DataTableCell align="end" hideBelow="sm" className="tabular-nums">
              {row.allocatedCents > 0
                ? formatEuros(row.allocatedCents)
                : t.notAllotted}
            </DataTableCell>
            <DataTableCell align="end" className="tabular-nums">
              {formatEuros(row.spentCents)}
            </DataTableCell>
            <DataTableCell align="end" hideBelow="sm" className="tabular-nums">
              {row.restCents === null ? "—" : formatEuros(row.restCents)}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
