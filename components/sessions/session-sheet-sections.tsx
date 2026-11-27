"use client";

import {
  IconFolderOpen,
  IconLink,
  IconMicrophone,
  IconUsers2,
} from "nucleo-sharp-essential";

import { IconDisc } from "@/components/icons";
import {
  SHEET_LINK,
  SheetBlock,
  SheetLines,
  SheetSummaryCard,
} from "@/components/ui/record-sheet";
import {
  SheetItemList,
  SheetLinkedBlock,
  SheetPeopleList,
} from "@/components/ui/record-sheet-blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/auth/redirects";
import { demos } from "@/lib/i18n/fr/demos";
import { sessions } from "@/lib/i18n/fr/sessions";
import type { StudioSession, StudioSessionRow } from "@/lib/sessions/types";

const fr = { demos, sessions };

const muted = "text-[color:var(--text-secondary)]";
const small = "text-caption font-medium text-[color:var(--text-secondary)]";

/** One part of the report, under its small heading. */
function Part({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={small}>{title}</span>
      <p className="break-words whitespace-pre-line">{text}</p>
    </div>
  );
}

/**
 * What a session's side sheet reads below its head: the summary card (its
 * state, where and with whom, its titles and participants folded), the
 * report once written, the preparation notes, the rushes' links, then its
 * artists and projects as pills. Each block absent when empty; a skeleton
 * while the session is read (`session` null).
 */
export function SessionSheetSections({
  row,
  session,
}: {
  row: StudioSessionRow;
  session: StudioSession | null;
}) {
  const t = fr.sessions;
  const place = [row.studio, row.engineer].filter(Boolean).join(" · ");
  const waiting =
    row.state === "toReport" && row.responsible
      ? t.report.waitingFor(row.responsible.name)
      : null;

  return (
    <>
      <SheetSummaryCard
        title={t.states[row.state]}
        caption={[place, waiting].filter(Boolean).join(" · ") || null}
        lines={[
          {
            icon: IconDisc,
            label: t.sheet.lines.titles,
            count: row.titles.length,
            list: (
              <SheetItemList
                items={row.titles.map((title) => ({
                  id: title.id,
                  label: title.title,
                  href: routes.master(title.id),
                  detail: title.demoStatus
                    ? fr.demos.badge(fr.demos.statuses[title.demoStatus])
                    : null,
                }))}
              />
            ),
          },
          {
            icon: IconUsers2,
            label: t.sheet.lines.participants,
            count: session?.attendees.length ?? 0,
            list: session && (
              <SheetPeopleList
                compact
                people={session.attendees.map((a) => ({
                  id: a.key,
                  name: a.name,
                  href: a.key.startsWith("c:")
                    ? routes.networkContact(a.key.slice(2))
                    : undefined,
                  detail: a.external ? null : t.sheet.team,
                }))}
              />
            ),
          },
        ]}
      />
      {!session ? (
        <div className="flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <>
          {session.reportNotes && (
            <SheetBlock
              title={t.report.title}
              aside={
                session.reportedBy ? t.report.signed(session.reportedBy) : null
              }
            >
              <div className="flex flex-col gap-4">
                <p className={`break-words whitespace-pre-line ${muted}`}>
                  {session.reportNotes}
                </p>
                {session.reportTakeaways && (
                  <Part
                    title={t.report.takeaways}
                    text={session.reportTakeaways}
                  />
                )}
                {session.reportNextStep && (
                  <Part
                    title={t.report.nextStep}
                    text={session.reportNextStep}
                  />
                )}
              </div>
            </SheetBlock>
          )}
          {session.notes && (
            <SheetBlock title={t.page.facts.notes}>
              <p className={`break-words whitespace-pre-line ${muted}`}>
                {session.notes}
              </p>
            </SheetBlock>
          )}
          {session.links.length > 0 && (
            <SheetBlock title={t.links.title}>
              <SheetLines>
                {session.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex min-w-0 items-center gap-2.5 ${SHEET_LINK}`}
                  >
                    <IconLink aria-hidden className="size-4 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </a>
                ))}
              </SheetLines>
            </SheetBlock>
          )}
        </>
      )}
      <SheetLinkedBlock
        title={t.sheet.linked}
        rows={[
          {
            icon: IconMicrophone,
            label: t.page.facts.artists,
            links: row.artists.map((a) => ({
              id: a.id,
              label: a.name,
              href: routes.artist(a.id),
            })),
          },
          {
            icon: IconFolderOpen,
            label: t.page.facts.projects,
            links: row.projects.map((p) => ({
              id: p.id,
              label: p.name,
              href: routes.project(p.id),
            })),
          },
        ]}
      />
    </>
  );
}
