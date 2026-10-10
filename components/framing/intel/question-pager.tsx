import { IconChevronLeft, IconChevronRight } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * Previous / next question of the Cadrage, in the guide's order, answered
 * or not: a question already known can always be read again, even once the
 * Cadrage is submitted or validated. No link at either end.
 */
export function QuestionPager({
  previousHref,
  nextHref,
}: {
  previousHref: string | null;
  nextHref: string | null;
}) {
  const t = fr.framingIntel.guide;
  const item = (href: string | null, label: string, icon: React.ReactNode) =>
    href ? (
      <ViewLink
        href={href}
        aria-label={label}
        title={label}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        {icon}
      </ViewLink>
    ) : (
      <span
        aria-hidden
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "pointer-events-none opacity-30",
        )}
      >
        {icon}
      </span>
    );
  return (
    <nav aria-label={t.pagerLabel} className="flex shrink-0 items-center gap-1">
      {item(
        previousHref,
        t.previous,
        <IconChevronLeft aria-hidden className="size-4" />,
      )}
      {item(
        nextHref,
        t.next,
        <IconChevronRight aria-hidden className="size-4" />,
      )}
    </nav>
  );
}
