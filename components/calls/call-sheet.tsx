"use client";

import {
  IconUnorderedList,
  IconPhone,
  IconUsers2,
  IconUser,
} from "nucleo-sharp-essential";
import Link from "next/link";

import { callState } from "@/components/calls/call-badges";
import { CallProjectPill } from "@/components/calls/call-project-pill";
import { CallSheetMenu } from "@/components/calls/call-sheet-menu";
import { JoinCallLink } from "@/components/calls/join-call-link";
import { FormMessage } from "@/components/auth/form-message";
import { IconExpand } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { MarkedText } from "@/components/ui/marked-text";
import { SheetBlock, SheetSummaryCard } from "@/components/ui/record-sheet";
import {
  SheetItemList,
  SheetPeopleList,
} from "@/components/ui/record-sheet-blocks";
import { SideSheet } from "@/components/ui/side-sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { useRecordSheetData } from "@/components/ui/use-record-sheet-data";
import { callHref, type CallDoor } from "@/lib/calls/door";
import { formatSlot, isUpcoming } from "@/lib/calls/format";
import type { CallListItem } from "@/lib/calls/queries";
import { loadCallSheet } from "@/lib/calls/sheet-actions";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * A call opened from its row, in the side sheet (the Réseau's model,
 * docs/STYLE-FINANCE-PARTOUT.md § 6.7 bis, Sacha 24/11/2026): its title,
 * slot, project or deal and state from the row at once, « Rejoindre » when
 * it is to come; its agenda, team and guests folded under their counts and
 * its report's summary, read when it opens.
 */
export function CallSheet({
  rows,
  now,
  door,
  deletable,
  index,
  onClose,
  onMove,
}: {
  // The calls in the order the table shows them (to come, then past).
  rows: CallListItem[];
  now: Date;
  door: CallDoor;
  deletable: (call: CallListItem) => boolean;
  index: number | null;
  onClose: () => void;
  onMove: (to: number) => void;
}) {
  const s = fr.calls.sheet;
  const call = index === null ? null : (rows[index] ?? null);
  const loaded = useRecordSheetData(call?.id ?? null, loadCallSheet);
  if (!call || index === null) return null;
  const data = loaded && loaded !== "failed" ? loaded : null;
  const upcoming = isUpcoming(call, now);
  const state = callState(call.status, { upcoming, closed: call.closed });
  const slot = formatSlot(call);

  return (
    <SideSheet
      open
      onClose={onClose}
      title={call.title}
      index={index}
      total={rows.length}
      onMove={onMove}
      bar={{
        icon: IconPhone,
        actions: (
          <>
            <Link
              href={callHref(door, call.id)}
              aria-label={s.expand}
              title={s.expand}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <IconExpand aria-hidden />
            </Link>
            <CallSheetMenu
              call={call}
              deletable={deletable(call)}
              size="icon-sm"
            />
          </>
        ),
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-display-sm font-medium break-words">
            {call.title}
          </p>
          <p className="text-[color:var(--text-secondary)] tabular-nums">
            <time dateTime={call.occurredAt}>{slot}</time>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
          <CallProjectPill
            projectId={call.projectId}
            title={call.projectTitle}
            deal={call.deal}
            size="sm"
          />
        </div>
        {call.meetingUrl && upcoming && (
          <div className="flex flex-wrap gap-2">
            <JoinCallLink url={call.meetingUrl} title={call.title} size="sm" />
          </div>
        )}
      </div>
      <SheetSummaryCard
        title={state.label}
        caption={slot}
        lines={[
          {
            icon: IconUnorderedList,
            label: s.lines.agenda,
            count: call.agenda?.length ?? 0,
            list: (
              <SheetItemList
                items={(call.agenda ?? []).map((item, i) => ({
                  id: `${i}`,
                  label: item.topic,
                  detail: item.minutes ? s.minutes(item.minutes) : null,
                }))}
              />
            ),
          },
          {
            icon: IconUser,
            label: s.lines.team,
            count: data?.team.length ?? 0,
            list: data && <SheetPeopleList compact people={data.team} />,
          },
          {
            icon: IconUsers2,
            label: s.lines.guests,
            count: data?.guests.length ?? call.guestEmails.length,
            list: data && <SheetPeopleList compact people={data.guests} />,
          },
        ]}
      />
      {loaded === "failed" && (
        <FormMessage kind="error">{s.loadFailed}</FormMessage>
      )}
      {data?.summary && (
        <SheetBlock title={s.report}>
          <div className="text-[color:var(--text-secondary)]">
            <MarkedText text={data.summary} />
          </div>
        </SheetBlock>
      )}
    </SideSheet>
  );
}
