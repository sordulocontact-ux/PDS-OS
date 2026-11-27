import { IconChevronRight, IconXmark } from "nucleo-sharp-essential";

import { statusBadgeVariants } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteLink, NoteLinkRef } from "@/lib/notes/views";
import { projectHue } from "@/lib/ui/category-hues";
import { cn } from "@/lib/utils";

const fr = { notes };

/** The page of the record a note is linked to. */
export function noteLinkHref(link: NoteLinkRef): string {
  switch (link.kind) {
    case "project":
      return routes.project(link.id);
    case "deal":
      return routes.deal(link.id);
    case "contract":
      return routes.contract(link.id);
  }
}

/**
 * What a written note is linked to, as a call's (CallProjectPill): a project
 * in the hue it has everywhere, « Deal · Nadia » or a contract's title in
 * slate, « Note de l'équipe » without a link. `open`: a way to the record
 * (« › »), above a table row's own link; `onRemove`: « × » unlinks it (the
 * note's author, in its document).
 */
export function NoteLinkPill({
  link,
  open = false,
  onRemove,
  size = "sm",
  emptyLabel,
}: {
  link: NoteLink | null;
  // Without a link: « Note de l'équipe » by default, « Réunion interne » for
  // a call (the Notes' « Lié à » column, one pill for both).
  emptyLabel?: string;
  open?: boolean;
  onRemove?: () => void;
  size?: "sm" | "md";
}) {
  const t = fr.notes.link;
  const className = cn(
    statusBadgeVariants({
      tone: projectHue(link?.kind === "project" ? link.id : null),
      size,
    }),
    "max-w-full",
  );
  if (!link)
    return (
      <span className={className}>
        <span className="truncate">{emptyLabel ?? fr.notes.teamNote}</span>
      </span>
    );
  const label = <span className="truncate">{link.label}</span>;
  return (
    <span className={cn(className, "relative z-10")}>
      {open ? (
        <ViewLink
          href={noteLinkHref(link)}
          aria-label={t.open(link.label)}
          className="flex min-w-0 items-center gap-1 underline-offset-4 outline-none hover:underline focus-visible:underline"
        >
          {label}
          <IconChevronRight aria-hidden className="size-3.5 shrink-0" />
        </ViewLink>
      ) : (
        label
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t.remove(link.label)}
          className="-mr-1 flex size-4 shrink-0 items-center justify-center rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <IconXmark aria-hidden className="size-3" />
        </button>
      )}
    </span>
  );
}
