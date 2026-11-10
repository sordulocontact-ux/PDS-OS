import { IconChevronLeft, IconChevronRight } from "nucleo-sharp-essential";

import { ViewLink } from "@/components/ui/view-link";
import { core } from "@/lib/i18n/fr/core";
import { cn } from "@/lib/utils";

const fr = { core };

// A link (one URL per screen: the Cadrage's questions, a generator's
// steps), or an action when the screens live in one page's state (Cadrage
// juridique); null at the ends.
export type RankNavTarget = string | (() => void) | null;

export type RankNav = {
  position: number;
  total: number;
  previous: RankNavTarget;
  next: RankNavTarget;
};

const arrowClass =
  "grid size-8 shrink-0 place-items-center rounded-full border border-[color:var(--border-default)] text-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[color:var(--border-hover)] hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [&_svg]:size-4";

/**
 * « ‹ 3 sur 8 › »: the screens before and after, one at a time, faded at
 * the ends. The questions of PO (PoQuestion: Cadrage, Cadrage juridique,
 * Stratégie) and the steps of a generator (Plan de sortie, Dossier de
 * presse, Sacha 10/11/2026: « comme les 8 et 6 dimensions »). Server-safe
 * with links; a client caller passes actions.
 */
export function RankArrows({
  nav,
  labels,
}: {
  nav: RankNav;
  // What the arrows walk through (« Question précédente », « Étape suivante »).
  labels: { nav: string; previous: string; next: string };
}) {
  const arrow = (to: RankNavTarget, label: string, icon: React.ReactNode) =>
    typeof to === "string" ? (
      <ViewLink href={to} aria-label={label} className={arrowClass}>
        {icon}
      </ViewLink>
    ) : to ? (
      <button
        type="button"
        onClick={to}
        aria-label={label}
        className={cn(arrowClass, "cursor-pointer")}
      >
        {icon}
      </button>
    ) : (
      <span aria-hidden className={cn(arrowClass, "opacity-35")}>
        {icon}
      </span>
    );
  return (
    <nav aria-label={labels.nav} className="flex shrink-0 items-center gap-1.5">
      {arrow(nav.previous, labels.previous, <IconChevronLeft />)}
      <span className="text-caption text-[color:var(--text-tertiary)] tabular-nums">
        {fr.core.rankArrows.rank(nav.position, nav.total)}
      </span>
      {arrow(nav.next, labels.next, <IconChevronRight />)}
    </nav>
  );
}
