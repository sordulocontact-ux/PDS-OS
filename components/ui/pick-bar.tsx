import { MineBadge } from "@/components/ui/mine-badge";
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

export type PickBarItem = {
  key: string;
  title: string;
  // « Externe · Studio Ressac », « Qui produit ? à choisir · livré ».
  sub: string;
  href: string;
  // The viewer's actions there (MineBadge).
  mine?: number;
};

/**
 * A choice of object that sits apart from the journey (proto `.pickbar`):
 * one card per object — its name with the viewer's count, a line about
 * it — the one shown outlined in ink. Links: each object has its own
 * page (the Production's deliverables).
 */
export function PickBar({
  label,
  items,
  current,
}: {
  label: string;
  items: PickBarItem[];
  current: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => {
        const on = item.key === current;
        return (
          <ViewLink
            key={item.key}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex min-w-[180px] flex-col items-start gap-0.5 rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-left text-foreground no-underline transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none max-[420px]:min-w-0 max-[420px]:flex-1",
              on
                ? "border-[color:var(--text-primary)] shadow-[0_0_0_1px_var(--text-primary)]"
                : "[@media(hover:hover)]:hover:bg-[var(--surface-soft)]",
            )}
          >
            <span className="flex items-center gap-1.5 font-semibold">
              {item.title}
              <MineBadge count={item.mine ?? 0} />
            </span>
            <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
              {item.sub}
            </span>
          </ViewLink>
        );
      })}
    </nav>
  );
}
