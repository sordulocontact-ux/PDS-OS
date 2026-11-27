"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useCallback, useState } from "react";

import { navItemClass } from "@/components/shell/nav-item";
import { QUICK_ACTION_ICONS } from "@/components/shell/quick-create/quick-action-icons";
import { useQuickCreate } from "@/components/shell/quick-create/quick-create-provider";
import { useQuickCreateShortcut } from "@/components/shell/quick-create/use-quick-create-shortcut";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { shell } from "@/lib/i18n/fr/shell";
import { cn } from "@/lib/utils";

const fr = { shell };

/**
 * The « + » of the shell: a menu of the creations open to the reader, from
 * any page. In the sidebar's head beside the collapse button (under the
 * magnifier when collapsed), in the mobile header beside the bell; « N »
 * opens it.
 */
export function QuickCreateButton({
  collapsed = false,
  placement = "sidebar",
}: {
  collapsed?: boolean;
  placement?: "sidebar" | "header";
}) {
  const t = fr.shell.quickCreate;
  const { actions, open } = useQuickCreate();
  const [menuOpen, setMenuOpen] = useState(false);
  // The sidebar shows from md; below, the header's button is the one on screen.
  const wide = useMediaQuery("(min-width: 768px)");
  const onScreen = placement === "sidebar" ? wide : !wide;
  const openMenu = useCallback(() => setMenuOpen(true), []);
  useQuickCreateShortcut(onScreen && actions.length > 0, openMenu);

  if (actions.length === 0) return null;

  const header = placement === "header";
  // Collapsed, a navigation icon under the magnifier; otherwise an icon
  // button like the collapse button (sidebar's head) or the bell (phone).
  const trigger = !collapsed ? (
    <Button
      variant="ghost"
      size="icon"
      className="hover:bg-[var(--nav-item-hover-bg)] aria-expanded:bg-[var(--nav-item-active-bg)]"
    />
  ) : (
    <button
      type="button"
      className={cn(
        navItemClass,
        "w-full cursor-pointer justify-center px-0 text-[color:var(--nav-fg-muted)] outline-none focus-visible:ring-2 focus-visible:ring-ring aria-expanded:bg-[var(--nav-item-active-bg)] modern:px-0",
      )}
    />
  );

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger render={trigger} aria-label={t.open}>
              <IconPlus
                aria-hidden
                className={collapsed ? "size-5 modern:size-4.5" : "size-5"}
              />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent side={collapsed && !header ? "right" : "bottom"}>
          <span className="flex items-center gap-2">
            {t.open}
            <Kbd>{t.shortcut}</Kbd>
          </span>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side={collapsed && !header ? "right" : "bottom"}
        align={header ? "end" : "start"}
      >
        {actions.map((action) => {
          const Icon = QUICK_ACTION_ICONS[action];
          return (
            <DropdownMenuItem key={action} onClick={() => open(action)}>
              <Icon aria-hidden />
              {t.actions[action]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
