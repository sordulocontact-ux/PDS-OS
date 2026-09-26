import Link from "next/link";

import { IconDisc } from "@/components/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/auth/redirects";
import { formatIsrc, type MasterRow } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { masterReleaseTone } from "@/lib/ui/state-tones";

// Page Master design: a single rule under the header, airy rows without rules,
// columns of 172 px + 20 px gap, the last one taking the rest.
const col = "w-48";
const head =
  "h-auto px-0 pr-5 pb-2 text-[length:var(--type-body-md)] font-medium text-[color:var(--text-secondary)]";
const cell = "px-0 py-2 pr-5 text-[length:var(--type-body-md)] font-medium";
const empty = "—";

export function MastersTable({ masters }: { masters: MasterRow[] }) {
  const t = fr.catalog.masters;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[color:var(--border-hairline)] hover:bg-transparent">
          <TableHead className={`${head} ${col}`}>{t.columns.title}</TableHead>
          <TableHead className={`${head} ${col}`}>
            {t.columns.artists}
          </TableHead>
          <TableHead className={`${head} ${col} hidden md:table-cell`}>
            {t.columns.isrc}
          </TableHead>
          <TableHead className={`${head} ${col} hidden lg:table-cell`}>
            {t.columns.release}
          </TableHead>
          <TableHead className={`${head} ${col} hidden sm:table-cell`}>
            {t.columns.releaseDate}
          </TableHead>
          <TableHead className={head}>{t.columns.status}</TableHead>
        </TableRow>
      </TableHeader>
      {/* 18 px between the header rule and the first row, 16 px between rows. */}
      <TableBody className="[&>tr:first-child>td]:pt-[18px]">
        {masters.map((master) => (
          <TableRow key={master.id} className="relative border-0">
            <TableCell className={cell}>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[color:var(--text-secondary)]"
                >
                  <IconDisc className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                  {/* The title link covers the whole row (after: pseudo-element). */}
                  <Link
                    href={routes.master(master.id)}
                    className="truncate outline-none after:absolute after:inset-0 focus-visible:underline"
                  >
                    {master.title}
                  </Link>
                  {master.version && (
                    <span className="truncate text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]">
                      {master.version}
                    </span>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className={cell}>{master.artists}</TableCell>
            <TableCell className={`${cell} hidden md:table-cell`}>
              {master.isrc ? formatIsrc(master.isrc) : empty}
            </TableCell>
            <TableCell className={`${cell} hidden lg:table-cell`}>
              {master.release ? (
                <span className="flex items-baseline gap-1.5">
                  {master.release.title}
                  {master.release.otherCount > 0 && (
                    <span className="text-[color:var(--text-tertiary)]">
                      <span aria-hidden>
                        {t.otherReleases.short(master.release.otherCount)}
                      </span>
                      <span className="sr-only">
                        {t.otherReleases.full(master.release.otherCount)}
                      </span>
                    </span>
                  )}
                </span>
              ) : (
                empty
              )}
            </TableCell>
            <TableCell className={`${cell} hidden sm:table-cell`}>
              {master.release?.plannedReleaseDate
                ? formatShortDate(master.release.plannedReleaseDate)
                : empty}
            </TableCell>
            <TableCell className={cell}>
              {master.release ? (
                <StatusBadge tone={masterReleaseTone[master.release.status]}>
                  {t.releaseStatus[master.release.status]}
                </StatusBadge>
              ) : (
                empty
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
