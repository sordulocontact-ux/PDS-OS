"use client";

import { IconGear2 } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { NotificationRow } from "@/components/notifications/notification-row";
import { PushToggle } from "@/components/notifications/push-toggle";
import { Button } from "@/components/ui/button";
import { PopoverTitle } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { notifications } from "@/lib/i18n/fr/notifications";
import { markNotificationsRead } from "@/lib/notifications/actions";
import { isRequestKind } from "@/lib/notifications/families";
import type { NotificationItem } from "@/lib/notifications/types";
import {
  notificationGroup,
  type NotificationGroup,
} from "@/lib/notifications/when";

const fr = { notifications };

type Tab = "all" | "requests" | "unread";
const GROUPS: NotificationGroup[] = ["today", "week", "older"];

/**
 * The bell's menu, after Figma's (Sacha, 06/11/2026): the title and the
 * gear (browser notifications), the tabs Toutes · Demandes · Non lues with
 * their counts and « Tout marquer comme lu », then the notifications by
 * Aujourd'hui, 7 derniers jours, Plus ancien. Opening one marks it read.
 * No Accept / Decline in the menu: a decision is taken on its own page,
 * where what is decided can be read.
 */
export function NotificationPanel({
  items,
  unreadCount,
  requestCount,
  vapidPublicKey,
  onNavigate,
}: {
  items: NotificationItem[];
  unreadCount: number;
  requestCount: number;
  vapidPublicKey: string | null;
  onNavigate: () => void;
}) {
  const t = fr.notifications;
  const [tab, setTab] = useState<Tab>("all");
  const [settings, setSettings] = useState(false);
  const [now] = useState(() => Date.now());
  const [, startTransition] = useTransition();

  const shown = items.filter((item) =>
    tab === "requests"
      ? isRequestKind(item.kind)
      : tab === "unread"
        ? !item.read
        : true,
  );
  const count = (label: string, n: number) =>
    n > 0 ? `${label} (${n})` : label;

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 px-4 pt-3 pb-2">
        <PopoverTitle className="flex-1 text-[length:var(--type-body-sm)] font-semibold">
          {t.title}
        </PopoverTitle>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="xs"
            className="text-[color:var(--selection)] modern:text-foreground"
            onClick={() => startTransition(() => markNotificationsRead(null))}
          >
            {t.markAllRead}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.settings}
          aria-expanded={settings}
          onClick={() => setSettings((open) => !open)}
        >
          <IconGear2 aria-hidden className="size-3.5 modern:size-4" />
        </Button>
      </div>
      {settings && (
        <div className="shrink-0 px-4 pb-3">
          <PushToggle publicKey={vapidPublicKey} />
        </div>
      )}
      <div className="shrink-0 border-b border-[color:var(--border-hairline)] px-3 pb-2">
        <SegmentedControl
          bare
          aria-label={t.tabs.label}
          options={[
            { value: "all", label: t.tabs.all },
            { value: "requests", label: count(t.tabs.requests, requestCount) },
            { value: "unread", label: count(t.tabs.unread, unreadCount) },
          ]}
          value={tab}
          onChange={(value) => value && setTab(value)}
        />
      </div>
      {shown.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {tab === "requests"
            ? t.emptyRequests
            : tab === "unread"
              ? t.emptyUnread
              : t.empty}
        </p>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
          {GROUPS.map((group) => {
            const rows = shown.filter(
              (item) => notificationGroup(item.createdAt, now) === group,
            );
            if (rows.length === 0) return null;
            return (
              <section key={group} aria-labelledby={`notifications-${group}`}>
                <h3
                  id={`notifications-${group}`}
                  className="px-3 pt-3 pb-1 text-xs font-medium text-[color:var(--text-tertiary)] modern:text-caption"
                >
                  {t.groups[group]}
                </h3>
                <ul>
                  {rows.map((item) => (
                    <li key={item.id}>
                      <NotificationRow
                        item={item}
                        now={now}
                        onOpen={() => {
                          onNavigate();
                          if (!item.read)
                            startTransition(() =>
                              markNotificationsRead([item.id]),
                            );
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
