"use client";

import { IconMagnifier } from "nucleo-sharp-essential";

import { navItemClass } from "@/components/shell/nav-item";
import { ShortcutKeys } from "@/components/shell/shortcuts/shortcut-keys";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The row opening a ⌘K search, at the top of a sidebar (Sacha 24/11/2026:
 * the search left the top band for the navigation): drawn as a navigation
 * entry, « Rechercher… » and ⌘K; the magnifier alone, its label in a
 * tooltip, when the sidebar is collapsed to icons. The app's search
 * (AppSearch) and Finance's (FinanceSearch).
 */
export function SearchTrigger({
  label,
  collapsed = false,
  shortcut = true,
  onClick,
}: {
  label: string;
  collapsed?: boolean;
  // ⌘K shown (not on a phone's menu).
  shortcut?: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? label : undefined}
      className={cn(
        navItemClass,
        "w-full cursor-pointer text-left text-[color:var(--nav-fg-muted)] outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed && "justify-center px-0 modern:px-0",
      )}
    >
      <IconMagnifier aria-hidden className="size-5 shrink-0 modern:size-4.5" />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {shortcut && (
            <ShortcutKeys action="search" className="max-sm:hidden" />
          )}
        </>
      )}
    </button>
  );
  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
