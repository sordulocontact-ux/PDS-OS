"use client";

import { IconBell } from "nucleo-sharp-essential";
import { useState } from "react";

import { NotificationPanel } from "@/components/notifications/notification-panel";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { notifications } from "@/lib/i18n/fr/notifications";
import type { NotificationItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const fr = { notifications };

// Bell with the unread count, and the latest notifications in its menu
// (NotificationPanel, after Figma). Opening one marks it read and goes to it. Data comes from the layout, which
// the Realtime listener refreshes when a notification arrives. The panel opens
// to the right from the sidebar, below from the mobile header. `nav` = the
// round button at the bottom of the sidebar, a blue dot for what is unread
// (Figma "PDS OS", node 47:12055); the mobile header keeps the count.
export function NotificationBell({
  items,
  unreadCount,
  requestCount,
  vapidPublicKey,
  side = "bottom",
  variant = "ghost",
}: {
  items: NotificationItem[];
  unreadCount: number;
  // Unread requests (« Demandes »): a decision or an answer is expected.
  requestCount: number;
  vapidPublicKey: string | null;
  side?: "right" | "bottom";
  variant?: "ghost" | "nav";
}) {
  const t = fr.notifications;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size={variant === "nav" ? "icon-sm" : "icon"}
            className={cn(
              "relative hover:bg-[var(--nav-item-hover-bg)] aria-expanded:bg-[var(--nav-item-active-bg)]",
              variant === "nav" &&
                "rounded-[var(--radius-pill)] border border-[color:var(--nav-border)]",
            )}
          />
        }
        aria-label={unreadCount > 0 ? t.bellUnread(unreadCount) : t.bell}
      >
        <IconBell
          aria-hidden
          className={variant === "nav" ? "size-4" : "size-5"}
        />
        {unreadCount > 0 &&
          (variant === "nav" ? (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 size-2 rounded-[var(--radius-pill)] bg-[var(--nav-unread-dot)]"
            />
          ) : (
            <CountBadge
              count={unreadCount}
              className="absolute -top-0.5 -right-0.5"
            />
          ))}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        // From the sidebar's bottom, the menu grows upward from the bell:
        // aligned on its top, it ran past a short screen and scrolled the page.
        align={side === "right" ? "end" : "start"}
        className="max-h-[min(36rem,var(--available-height),calc(100dvh-2rem))]"
      >
        <NotificationPanel
          items={items}
          unreadCount={unreadCount}
          requestCount={requestCount}
          vapidPublicKey={vapidPublicKey}
          onNavigate={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
