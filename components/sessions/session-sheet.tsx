"use client";

import { IconSliders } from "nucleo-sharp-essential";
import Link from "next/link";
import { useCallback } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { IconExpand } from "@/components/icons";
import {
  sessionHours,
  sessionName,
} from "@/components/sessions/session-format";
import { SessionReportButton } from "@/components/sessions/session-page/report-button";
import { SessionHeaderActions } from "@/components/sessions/session-page/session-header-actions";
import { SessionSheetSections } from "@/components/sessions/session-sheet-sections";
import { buttonVariants } from "@/components/ui/button";
import { SideSheet } from "@/components/ui/side-sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { useRecordSheetData } from "@/components/ui/use-record-sheet-data";
import { sessions } from "@/lib/i18n/fr/sessions";
import { sessionHref, type SessionDoor } from "@/lib/sessions/door";
import { loadSessionSheet } from "@/lib/sessions/sheet-actions";
import type { StudioSessionRow } from "@/lib/sessions/types";
import { sessionStateTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { sessions };

// What the row shows changes once the session is edited or reported (the
// list is read again): the sheet reads the session again then.
const versionOf = (row: StudioSessionRow) =>
  [
    row.id,
    row.state,
    row.date,
    row.startsAt,
    row.endsAt,
    row.studio,
    row.engineer,
    ...row.artists.map((a) => a.id),
    ...row.projects.map((p) => p.id),
    ...row.titles.map((m) => m.id),
  ].join("|");

/**
 * A studio session opened from its row, in the side sheet (the Réseau's
 * model, docs/STYLE-FINANCE-PARTOUT.md § 6.7 bis; Sacha 27/11/2026, like
 * Notes, Réseau and Contrats): its name, day, hours and state from the row
 * at once, « Rédiger le compte rendu » once the séance has started; then,
 * read when it opens, its titles and participants folded under their
 * counts, its report, its preparation notes, its rushes and its linked
 * records. « Ouvrir la session » leads to its page (titles and links
 * edited there, a collective's contracts).
 */
export function SessionSheet({
  rows,
  door,
  index,
  onClose,
  onMove,
}: {
  // The sessions in the order the table shows them.
  rows: StudioSessionRow[];
  door: SessionDoor;
  index: number | null;
  onClose: () => void;
  onMove: (to: number) => void;
}) {
  const t = fr.sessions;
  const row = index === null ? null : (rows[index] ?? null);
  const load = useCallback(
    (key: string) => loadSessionSheet(key.split("|")[0]),
    [],
  );
  const loaded = useRecordSheetData(row ? versionOf(row) : null, load);
  if (!row || index === null) return null;
  const data = loaded && loaded !== "failed" ? loaded : null;
  const name = sessionName(row);
  const when = [row.date ? formatDay(row.date) : t.noDate, sessionHours(row)]
    .filter(Boolean)
    .join(" · ");
  // The report opens once the séance starts (Ibé, 06/11/2026).
  const reportable =
    row.state === "ongoing" || row.state === "toReport" || row.state === "done";

  return (
    <SideSheet
      open
      onClose={onClose}
      title={name}
      index={index}
      total={rows.length}
      onMove={onMove}
      bar={{
        icon: IconSliders,
        actions: (
          <>
            <Link
              href={sessionHref(door, row.id)}
              aria-label={t.sheet.expand}
              title={t.sheet.expand}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <IconExpand aria-hidden />
            </Link>
            {data?.canEdit && (
              <SessionHeaderActions session={data.session} inSheet />
            )}
          </>
        ),
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-display-sm font-medium break-words">{name}</p>
          <p className="text-[color:var(--text-secondary)] tabular-nums">
            {when}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={sessionStateTone[row.state]}>
            {t.states[row.state]}
          </StatusBadge>
        </div>
        {data?.canEdit && reportable && (
          <div className="flex flex-wrap gap-2">
            <SessionReportButton session={data.session} />
          </div>
        )}
      </div>
      <SessionSheetSections row={row} session={data?.session ?? null} />
      {loaded === "failed" && (
        <FormMessage kind="error">{t.sheet.loadFailed}</FormMessage>
      )}
    </SideSheet>
  );
}
