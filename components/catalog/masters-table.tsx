import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/auth/redirects";
import {
  formatDuration,
  formatIsrc,
  masterLabel,
  type MasterListItem,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export function MastersTable({ masters }: { masters: MasterListItem[] }) {
  const t = fr.catalog.masters.columns;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.title}</TableHead>
          <TableHead>{t.artists}</TableHead>
          <TableHead className="hidden md:table-cell">{t.isrc}</TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            {t.duration}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {masters.map((master) => (
          <TableRow key={master.id} className="relative">
            <TableCell className="font-medium">
              {/* The title link covers the whole row (after: pseudo-element). */}
              <Link
                href={routes.master(master.id)}
                className="outline-none after:absolute after:inset-0 focus-visible:underline"
              >
                {masterLabel(master)}
              </Link>
            </TableCell>
            <TableCell>{master.artists}</TableCell>
            <TableCell className="hidden font-mono text-muted-foreground md:table-cell">
              {master.isrc ? formatIsrc(master.isrc) : "—"}
            </TableCell>
            <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
              {master.durationSeconds
                ? formatDuration(master.durationSeconds)
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
