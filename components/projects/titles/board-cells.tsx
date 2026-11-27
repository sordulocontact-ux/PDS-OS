import type { ReactNode } from "react";

import {
  isUnnamed,
  masterHrefOf,
  titleHrefOf,
  type BoardLinks,
  type BoardRow,
} from "@/components/projects/titles/board-rows";
import { releaseValueOf } from "@/components/projects/titles/recap-edits-words";
import {
  LinkedPill,
  MixPill,
  muted,
} from "@/components/projects/titles/recap-facts";
import { EMPTY_CELL } from "@/components/ui/data-table";
import { ViewLink } from "@/components/ui/view-link";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { titleMixFact } from "@/lib/projects/title-board-rules";
import { cn } from "@/lib/utils";

// The cells of « Titres » par artiste that are not a state of the artist
// (board-columns.tsx): one fact each, on one line, cut by « … » (the whole
// on hover, DataTable's OverflowHintArea). No hook: rendered on the server
// too.

const fr = { projectTitles };

// A name that opens its page: the link is the name itself, in the text's
// ink (the links' own would outshine the artist's name).
export const NAME_LINK =
  "relative z-10 block max-w-full truncate rounded-sm outline-none hover:underline focus-visible:underline";

export const Empty = () => <span className={muted}>{EMPTY_CELL}</span>;

/** A cell's words on one line, cut by « … »; « — » without any. */
export function Text({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  if (children === null || children === undefined || children === "")
    return <Empty />;
  return <span className={cn("block truncate", className)}>{children}</span>;
}

/** A fact read in a second ink (a role, a number, a rate, a note). */
export const SECONDARY = "text-[color:var(--text-secondary)]";

/** The title's name, to its page (its Master before the launch); a title
 * without a name says its guests « (à nommer) », in grey. */
export function TitleCell({
  row,
  projectId,
  links,
}: {
  row: BoardRow;
  projectId: string;
  links: BoardLinks;
}) {
  const label = row.title.recap.label;
  const ink = isUnnamed(row.title)
    ? "text-[color:var(--text-tertiary)]"
    : "text-[color:var(--text-primary)]";
  const href = titleHrefOf(projectId, row.title, links);
  if (!href) return <Text className={ink}>{label}</Text>;
  return (
    <ViewLink href={href} className={cn(NAME_LINK, ink)}>
      {label}
    </ViewLink>
  );
}

/** Where the title stands in the Master (« Mix V2 à valider »), to its
 * Master; an abandoned title is out of it (lot 9). */
export function MixCell({ row, links }: { row: BoardRow; links: BoardLinks }) {
  const fact =
    row.title.status === "abandoned"
      ? null
      : titleMixFact(row.title.masterState);
  return (
    <MixPill
      label={fact?.label ?? null}
      status={fact?.status ?? null}
      href={masterHrefOf(row.title, links)}
    />
  );
}

/** « Sortie » of the title: Oui / Non / Pas décidé, changed in the side
 * sheet. */
export function ReleaseCell({ row }: { row: BoardRow }) {
  const t = fr.projectTitles.recap.release;
  return (
    <Text className={SECONDARY}>
      {t[releaseValueOf(row.title.recap.releaseDecision)]}
    </Text>
  );
}

/** The title's release deposit (lot 15), to the Distribution. */
export function DistributionCell({
  row,
  links,
}: {
  row: BoardRow;
  links: BoardLinks;
}) {
  const deposit = links.distribution?.[row.title.id];
  if (!deposit) return <Empty />;
  return (
    <LinkedPill href={deposit.href} tone={deposit.tone} label={deposit.label} />
  );
}
