import type { ReactNode } from "react";

import { SegmentedLinks } from "@/components/ui/segmented-control";
import { TabBar, type TabBarItem } from "@/components/ui/tab-bar";
import { cn } from "@/lib/utils";

// Views of a table as tabs with their counts (docs/DESIGN.md § 4,
// « Onglets »), above the table or its empty state: the tabs stay when a
// view has no row. Views in the URL (href) or filtered in place (onSelect).
// `action`: a secondary filter or a button at the end of the bar. With a
// single view and no action, only the table is shown. `segmented` (Finance's
// new style, after the proto, Sacha 15/11/2026): the views as a compact
// segmented filter on the action's line, no rule under them (views in the
// URL only). In the new style of the whole app (docs/STYLE-FINANCE-PARTOUT.md
// § 6.2) views in the URL are always segmented; the classic style keeps the
// tabs.
export function DataTableViews({
  label,
  views,
  action,
  pageAction,
  segmented = false,
  children,
}: {
  label: string;
  views: TabBarItem[];
  action?: ReactNode;
  // The page's own action, at the end of the views' line in the new style
  // (SectionFrame `toolsAction`): the page's header shows it in the classic
  // style.
  pageAction?: ReactNode;
  segmented?: boolean;
  children: ReactNode;
}) {
  if (views.length < 2 && !action && !pageAction) return children;
  const linked = views.every((v) => v.href);
  const bar = linked && (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        !segmented && "classic:hidden",
      )}
    >
      {views.length > 1 && (
        <SegmentedLinks
          label={label}
          options={views.map((v) => ({
            key: v.href ?? v.label,
            href: v.href ?? "",
            label:
              v.count === undefined ? (
                v.label
              ) : (
                <>
                  {v.label}
                  <span className="text-[color:var(--text-tertiary)] tabular-nums">
                    {v.count}
                  </span>
                </>
              ),
            current: v.current,
          }))}
        />
      )}
      {(action || pageAction) && (
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {action}
          {pageAction && <div className="classic:hidden">{pageAction}</div>}
        </div>
      )}
    </div>
  );
  if (segmented && linked)
    return (
      <div className="flex flex-col gap-[var(--stack-loose)]">
        {bar}
        {children}
      </div>
    );
  return (
    <div className="flex flex-col gap-[var(--stack-loose)]">
      {bar}
      {/* The tabs' rule runs the whole width, under the action too (Sacha,
          29/10). */}
      <div
        className={cn(
          "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:shadow-[inset_0_-1px_0_var(--border-hairline)]",
          linked && "modern:hidden",
        )}
      >
        {views.length > 1 ? (
          <div className="min-w-0 flex-1">
            <TabBar label={label} items={views} />
          </div>
        ) : (
          <span />
        )}
        {/* Views filtered in place keep this line in the new style too: the
            page's action goes at its end, or it would be shown nowhere. */}
        {(action || (!linked && pageAction)) && (
          <div className="flex shrink-0 items-center gap-3">
            {action}
            {!linked && pageAction && (
              <div className="classic:hidden">{pageAction}</div>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
