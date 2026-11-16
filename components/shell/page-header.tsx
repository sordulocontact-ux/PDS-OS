import { TitleBlock } from "@/components/ui/title-block";
import { cn } from "@/lib/utils";

// Title block of an application page: title, optional description, and an
// optional primary action aligned right (below on narrow screens), and an
// optional leading visual before the title (an artist picture), and an
// optional state badge beside it (the audio state of a title).
// `list`: the page of a section, a list (docs/STYLE-FINANCE-PARTOUT.md
// § 5.1 and 6.1): in the new style its title stays for screen readers only
// (the navigation already says where one is), no description, its action
// alone on the right; the classic style shows them as before.
export function PageHeader({
  title,
  description,
  action,
  leading,
  badge,
  list = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  leading?: React.ReactNode;
  badge?: React.ReactNode;
  list?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        list && "modern:flex-row modern:justify-end",
        list && !action && "modern:sr-only",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-4",
          list && "modern:sr-only",
        )}
      >
        {leading}
        <TitleBlock>
          {badge ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="font-heading text-display-lg">{title}</h1>
              {badge}
            </div>
          ) : (
            <h1 className="font-heading text-display-lg">{title}</h1>
          )}
          {description && (
            <p
              className={cn(
                "text-body-lg text-[color:var(--text-secondary)]",
                list && "modern:hidden",
              )}
            >
              {description}
            </p>
          )}
        </TitleBlock>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
