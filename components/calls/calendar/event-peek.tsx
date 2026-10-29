"use client";

import Link from "next/link";

import { CallStatusBadge } from "@/components/calls/call-badges";
import { eventTime } from "@/components/calls/calendar-event";
import { JoinCallLink } from "@/components/calls/join-call-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Popover, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import type { CalendarEvent } from "@/lib/calls/calendar";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * The card of a call clicked in the calendar, as in Teams: when, where it
 * belongs, its state, « Rejoindre » while it can be joined, « Ouvrir le
 * call », and « Modifier l'horaire » for whoever works on it (the keyboard
 * way to what a drag does).
 */
export function EventPeek({
  peek,
  onClose,
  onReschedule,
}: {
  peek: { event: CalendarEvent; anchor: HTMLElement } | null;
  onClose: () => void;
  onReschedule: (event: CalendarEvent) => void;
}) {
  const t = fr.calls.calendar;
  const event = peek?.event;

  return (
    <Popover
      open={peek !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {peek && event && (
        <PopoverContent
          anchor={peek.anchor}
          side="right"
          align="start"
          className="gap-4 p-4"
        >
          <div className="flex flex-col gap-1">
            <PopoverTitle className="text-base font-semibold break-words">
              {event.call.title}
            </PopoverTitle>
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {longDay.format(new Date(event.call.occurredAt))} ·{" "}
              <span className="tabular-nums">{eventTime(event)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {event.call.projectTitle ?? t.internal}
            </p>
          </div>
          <div>
            <CallStatusBadge
              status={event.call.status}
              upcoming={event.upcoming}
              closed={event.call.closed}
            />
          </div>
          {event.call.meetingUrl && (
            <a
              href={event.call.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              translate="no"
              className="w-fit rounded-sm font-mono text-sm break-all underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {event.call.meetingUrl.replace(/^https:\/\//, "")}
            </a>
          )}
          <div className="flex flex-wrap gap-2">
            {event.call.meetingUrl && event.upcoming && (
              <JoinCallLink
                url={event.call.meetingUrl}
                title={event.call.title}
                size="sm"
                variant="default"
              />
            )}
            {event.call.meetingUrl && (
              <CopyButton
                value={event.call.meetingUrl}
                label={fr.calls.details.copy}
                copiedLabel={fr.calls.details.copied}
                failedLabel={fr.calls.details.copyFailed}
                size="sm"
              />
            )}
            <Link
              href={event.call.href}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t.peek.open}
            </Link>
            {event.editable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onReschedule(event)}
              >
                {t.peek.reschedule}
              </Button>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
