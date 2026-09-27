import type { ReactNode } from "react";

import { TabBar, type TabBarItem } from "@/components/ui/tab-bar";

export type TabFilterOption = TabBarItem;

// Views of a list as tabs with their counts, the choice in the URL:
// shareable, and Back works. `action`: a secondary filter at the end of the
// bar.
export function TabFilter({
  label,
  options,
  action,
}: {
  label: string;
  options: TabFilterOption[];
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <TabBar label={label} items={options} />
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
