import type { ReactNode } from "react";

import { TabBar, type TabBarItem } from "@/components/ui/tab-bar";

// Views of a table as tabs with their counts (docs/DESIGN.md § 4,
// « Onglets »), above the table or its empty state: the tabs stay when a
// view has no row. Views in the URL (href) or filtered in place (onSelect).
// `action`: a secondary filter or a button at the end of the bar. With a
// single view and no action, only the table is shown.
export function DataTableViews({
  label,
  views,
  action,
  children,
}: {
  label: string;
  views: TabBarItem[];
  action?: ReactNode;
  children: ReactNode;
}) {
  if (views.length < 2 && !action) return children;
  return (
    <div className="flex flex-col gap-[var(--stack-loose)]">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {views.length > 1 ? <TabBar label={label} items={views} /> : <span />}
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
