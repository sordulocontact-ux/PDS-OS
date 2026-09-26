import Link from "next/link";

import { ArtistAvatar } from "@/components/catalog/artist-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/auth/redirects";
import type { ArtistListItem } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export function ArtistsTable({ artists }: { artists: ArtistListItem[] }) {
  const t = fr.catalog.artists.columns;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.name}</TableHead>
          <TableHead className="text-right">{t.masters}</TableHead>
          <TableHead className="hidden md:table-cell">{t.notes}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {artists.map((artist) => (
          <TableRow key={artist.id} className="relative">
            <TableCell className="font-medium">
              {/* The name link covers the whole row (after: pseudo-element). */}
              <div className="flex items-center gap-3">
                <ArtistAvatar
                  name={artist.name}
                  pictureUrl={artist.pictureUrl}
                />
                <Link
                  href={routes.artist(artist.id)}
                  className="outline-none after:absolute after:inset-0 focus-visible:underline"
                >
                  {artist.name}
                </Link>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {artist.masterCount}
            </TableCell>
            <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
              {artist.notes}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
