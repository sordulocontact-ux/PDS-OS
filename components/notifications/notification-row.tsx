"use client";

import {
  IconBell,
  IconCalendarDays,
  IconChatBubbleForward,
  IconCheck,
  IconFile,
  IconMoneyBillCoin,
  IconPenWriting2,
  IconPlus,
} from "nucleo-sharp-essential";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { notifications } from "@/lib/i18n/fr/notifications";
import {
  notificationFamily,
  type NotificationFamily,
} from "@/lib/notifications/families";
import type { NotificationItem } from "@/lib/notifications/types";
import { notificationAgo } from "@/lib/notifications/when";
import { cn } from "@/lib/utils";

const fr = { notifications };

const FAMILY_ICONS: Record<
  NotificationFamily,
  React.ComponentType<{ className?: string }>
> = {
  request: IconPenWriting2,
  done: IconCheck,
  changes: IconPenWriting2,
  received: IconFile,
  added: IconPlus,
  meeting: IconCalendarDays,
  money: IconMoneyBillCoin,
  message: IconChatBubbleForward,
};

/**
 * One notification of the bell's menu (Figma « PDS OS », Sacha 06/11/2026):
 * the actor's avatar with the badge of what happened, their name and when,
 * a blue dot while unread, then what they did. Without an actor (an engineer
 * or a provider through their link), the badge's icon stands alone and the
 * project names it.
 */
export function NotificationRow({
  item,
  now,
  onOpen,
}: {
  item: NotificationItem;
  // The menu's « now », the same for every row.
  now: number;
  onOpen: () => void;
}) {
  const t = fr.notifications;
  const Icon = FAMILY_ICONS[notificationFamily(item.kind)];

  return (
    <Link
      href={item.href}
      onClick={onOpen}
      // Relative: the « Non lue » read aloud (sr-only, absolute) stays in its
      // row, clipped by the list, instead of hanging under the page and
      // making it scroll (Sacha, 06/11/2026).
      className="relative flex items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2 no-underline transition-colors duration-[var(--duration-fast)] hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
    >
      {/* Sized to the avatar (never stretched to the row), so the badge
          stays on its corner however long the text. */}
      <span aria-hidden className="relative flex size-8 shrink-0">
        {item.actor ? (
          <>
            <Avatar name={item.actor} pictureUrl={null} className="size-8" />
            <span className="absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-[var(--radius-circle)] border-2 border-[color:var(--popover)] bg-[var(--surface-sunken)] text-[color:var(--text-secondary)]">
              <Icon className="size-2.5" />
            </span>
          </>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-[var(--radius-circle)] bg-[var(--surface-sunken)] text-[color:var(--text-secondary)]">
            {item.headline ? (
              <Icon className="size-3.5" />
            ) : (
              <IconBell className="size-3.5" />
            )}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-xs",
              item.read ? "font-medium" : "font-semibold",
            )}
          >
            {item.headline ?? t.pdsOs}
          </span>
          <time
            dateTime={item.createdAt}
            className="shrink-0 text-xs text-[color:var(--text-tertiary)] tabular-nums"
          >
            {notificationAgo(item.createdAt, now)}
          </time>
          <span
            className={cn(
              "size-1.5 shrink-0 self-center rounded-[var(--radius-circle)]",
              item.read ? "bg-transparent" : "bg-[var(--nav-unread-dot)]",
            )}
          >
            {!item.read && <span className="sr-only">{t.unreadDot}</span>}
          </span>
        </span>
        <span
          className={cn(
            "line-clamp-2 text-xs",
            item.read
              ? "text-[color:var(--text-tertiary)]"
              : "text-[color:var(--text-secondary)]",
          )}
        >
          {item.action}
        </span>
      </span>
    </Link>
  );
}
