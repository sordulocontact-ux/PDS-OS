import Link from "next/link";

import { routes } from "@/lib/auth/redirects";
import type { Credit } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Performing artists of the master in credit order, each a link to its page.
export function MasterArtists({ credits }: { credits: Credit[] }) {
  return (
    <ol className="divide-y divide-border rounded-xl border border-border">
      {credits.map((credit, index) => (
        <li
          key={credit.artistId}
          className="relative flex items-center gap-3 px-4 py-3"
        >
          <span className="w-4 text-sm text-muted-foreground tabular-nums">
            {index + 1}
          </span>
          <Link
            href={routes.artist(credit.artistId)}
            className="min-w-0 flex-1 truncate text-sm font-medium no-underline after:absolute after:inset-0 hover:underline"
          >
            {credit.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {fr.catalog.artistPicker.roles[credit.role]}
          </span>
        </li>
      ))}
    </ol>
  );
}
