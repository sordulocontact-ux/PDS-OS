import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { network } from "@/lib/i18n/fr/network";
import type { NetworkKind } from "@/lib/network/types";

const fr = { network };

const noticeClass =
  "flex flex-wrap items-center gap-3 rounded-xl border border-border px-3 py-2.5";

/** A new person named exactly as an artist of the catalog: linked unless
 * removed (UX test of 09/10/2026, section 8). */
export function ArtistNamesake({
  artist,
  linked,
  onToggle,
}: {
  artist: { id: string; name: string };
  linked: boolean;
  onToggle: () => void;
}) {
  const t = fr.network.form;
  return (
    <div role="status" className={noticeClass}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">
          {linked ? t.artistLinked(artist.name) : t.artistUnlinked}
        </span>
        {linked && (
          <span className="text-xs text-muted-foreground">
            {t.artistLinkedHint}
          </span>
        )}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onToggle}>
        {linked ? t.artistUnlink : t.artistRelink(artist.name)}
      </Button>
    </div>
  );
}

/**
 * Contacts of the Réseau of the same name, before a new one is added: open
 * one to reuse it, or carry on (never blocking). From a form that stays open
 * behind (`newTab`), the contact opens in a new tab, the typing is kept.
 */
export function DuplicateNotice({
  matches,
  newTab,
}: {
  matches: { id: string; name: string; kind: NetworkKind }[];
  newTab: boolean;
}) {
  const t = fr.network.form;
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="flex flex-col">
        <span className="text-sm font-medium">
          {t.duplicates(matches.length)}
        </span>
        <span className="text-xs text-muted-foreground">
          {t.duplicatesHint}
        </span>
      </span>
      {matches.slice(0, 3).map((match) => (
        <div key={match.id} className={noticeClass}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{match.name}</span>
            <span className="text-xs text-muted-foreground">
              {fr.network.kinds[match.kind]}
            </span>
          </span>
          <Link
            href={routes.networkContact(match.id)}
            target={newTab ? "_blank" : undefined}
            rel={newTab ? "noopener noreferrer" : undefined}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t.openContact}
          </Link>
        </div>
      ))}
    </div>
  );
}

/**
 * What a change of kind of a saved contact does, said before saving (ticket
 * of 11/10/2026): roles put aside, organization detached, catalog artist
 * unlinked; an organization with people attached cannot become a person
 * (refused by the database). Contracts, credits and history stay.
 */
export function KindChangeNotice({
  saved,
  kind,
  roles,
  parentName,
  artistName,
  memberCount,
}: {
  // A contact already in the Réseau: what is detached, and what stays.
  saved: boolean;
  kind: NetworkKind;
  roles: string | null;
  parentName: string | null;
  artistName: string | null;
  memberCount: number;
}) {
  const t = fr.network.form.kindChange;
  const lines = [
    roles && t.roles(roles),
    kind === "organization" && parentName && t.parent(parentName),
    kind === "organization" && artistName && t.artist(artistName),
    kind === "person" && memberCount > 0 && t.members(memberCount),
    saved && t.kept,
  ].filter((line): line is string => !!line);
  return (
    <ToneCallout tone="warning" role="status">
      <span className="block">{t.title(fr.network.kinds[kind])}</span>
      {lines.map((line) => (
        <span key={line} className="block">
          – {line}
        </span>
      ))}
    </ToneCallout>
  );
}
