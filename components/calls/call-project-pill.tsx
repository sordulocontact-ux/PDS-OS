import { IconChevronRight } from "nucleo-sharp-essential";

import { statusBadgeVariants } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { calls } from "@/lib/i18n/fr/calls";
import { projectHue } from "@/lib/ui/category-hues";
import { cn } from "@/lib/utils";

const fr = { calls };

/**
 * Where a call belongs, in its project's hue (the same as in Travail and the
 * calendars), « Réunion interne » in slate: a row's Projet column, or — with
 * `href` — the way from a call opened in Calls to its project
 * (« Projet : Néons › »). A deal's call (BIZ 6) says « Deal · Nadia »,
 * linked to the deal with `href`.
 */
export function CallProjectPill({
  projectId,
  title,
  deal = null,
  href,
  size = "md",
}: {
  projectId: string | null;
  // Null: an internal meeting.
  title: string | null;
  // A deal's call: the deal's artist (never a contact).
  deal?: { artistName: string | null } | null;
  href?: string;
  size?: "sm" | "md";
}) {
  const className = cn(
    statusBadgeVariants({ tone: projectHue(projectId), size }),
    "max-w-full",
  );
  if (deal) {
    const label = fr.calls.page.deal.pill(deal.artistName);
    return href ? (
      <ViewLink
        href={href}
        aria-label={fr.calls.page.deal.open}
        className={cn(
          className,
          "underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        )}
      >
        <span className="truncate">{label}</span>
        <IconChevronRight aria-hidden className="size-3.5 shrink-0" />
      </ViewLink>
    ) : (
      <span className={className}>
        <span className="truncate">{label}</span>
      </span>
    );
  }
  if (!projectId || !title)
    return <span className={className}>{fr.calls.all.internal}</span>;
  if (!href)
    return (
      <span className={className}>
        <span className="truncate">{title}</span>
      </span>
    );
  return (
    <ViewLink
      href={href}
      aria-label={fr.calls.page.projectLink(title)}
      className={cn(
        className,
        "underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <span className="truncate">{fr.calls.page.project(title)}</span>
      <IconChevronRight aria-hidden className="size-3.5 shrink-0" />
    </ViewLink>
  );
}
