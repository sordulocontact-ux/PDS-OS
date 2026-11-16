import type { ReactNode } from "react";

import { SegmentedLinks } from "@/components/ui/segmented-control";
import { TabBar, type TabBarItem } from "@/components/ui/tab-bar";

// Views of a table as tabs with their counts (docs/DESIGN.md § 4,
// « Onglets »), above the table or its empty state: the tabs stay when a
// view has no row. Views in the URL (href) or filtered in place (onSelect).
// `action`: a secondary filter or a button at the end of the bar. With a
// single view and no action, only the table is shown. `segmented` (Finance's
// new style, after the proto, Sacha 15/11/2026): the views as a compact
// segmented filter on the action's line, no rule under them (views in the
// URL only).
export function DataTableViews({
  label,
  views,
  action,
  segmented = false,
  children,
}: {
  label: string;
  views: TabBarItem[];
  action?: ReactNode;
  segmented?: boolean;
  children: ReactNode;
}) {
  if (views.length < 2 && !action) return children;
  if (segmented && views.every((v) => v.href))
    return (
      <div className="flex flex-col gap-[var(--stack-loose)]">
        <div className="flex flex-wrap items-center gap-3">
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
          {action && <div className="ml-auto shrink-0">{action}</div>}
        </div>
        {children}
      </div>
    );
  return (
    <div className="flex flex-col gap-[var(--stack-loose)]">
      {/* The tabs' rule runs the whole width, under the action too (Sacha,
          29/10). */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:shadow-[inset_0_-1px_0_var(--border-hairline)]">
        {views.length > 1 ? (
          <div className="min-w-0 flex-1">
            <TabBar label={label} items={views} />
          </div>
        ) : (
          <span />
        )}
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
