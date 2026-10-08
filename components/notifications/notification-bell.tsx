"use client";

import { IconBell } from "nucleo-sharp-essential";
import Link from "next/link";
import { useState, useTransition } from "react";

import { PushToggle } from "@/components/notifications/push-toggle";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import { markNotificationsRead } from "@/lib/notifications/actions";
import type { NotificationItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

// Bell with the unread count, and the latest notifications. Opening one
// marks it read and goes to its project. Data comes from the layout, which
// the Realtime listener refreshes when a notification arrives. The panel opens
// to the right from the sidebar, below from the mobile header. `nav` = the
// round button at the bottom of the sidebar, a blue dot for what is unread
// (Figma "PDS OS", node 47:12055); the mobile header keeps the count.
export function NotificationBell({
  items,
  unreadCount,
  vapidPublicKey,
  side = "bottom",
  variant = "ghost",
}: {
  items: NotificationItem[];
  unreadCount: number;
  vapidPublicKey: string | null;
  side?: "right" | "bottom";
  variant?: "ghost" | "nav";
}) {
  const t = fr.notifications;
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

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
      <PopoverContent side={side} align="start">
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border-hairline)] px-4 py-3">
          <PopoverTitle>{t.title}</PopoverTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startTransition(() => markNotificationsRead(null))}
            >
              {t.markAllRead}
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="flex-1 divide-y divide-[color:var(--border-hairline)] overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    if (!item.read)
                      startTransition(() => markNotificationsRead([item.id]));
                  }}
                  className="flex min-h-11 gap-3 px-4 py-3 text-sm no-underline hover:bg-[var(--control-bg-hover)]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      item.read ? "bg-transparent" : "bg-foreground",
                    )}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        item.read ? "text-muted-foreground" : "font-medium",
                      )}
                    >
                      {item.text}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDay(item.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-[color:var(--border-hairline)] px-4 py-3">
          <PushToggle publicKey={vapidPublicKey} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
