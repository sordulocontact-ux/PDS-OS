"use client";

import { useState, type ReactNode } from "react";

import { IconDisc } from "@/components/icons";
import { ArtistName } from "@/components/projects/titles/board-artist-cell";
import { BoardCards } from "@/components/projects/titles/board-cards";
import { boardColumns } from "@/components/projects/titles/board-columns";
import {
  BoardRowMenu,
  rowPlansCall,
} from "@/components/projects/titles/board-row-menu";
import {
  boardRowsOf,
  creditOf,
  invitedOnOf,
  rowAlerts,
  variedRoles,
  type BoardContext,
  type BoardLinks,
  type BoardRow,
} from "@/components/projects/titles/board-rows";
import { BoardTable } from "@/components/projects/titles/board-table";
import { TitleArtistSheet } from "@/components/projects/titles/title-artist-sheet";
import {
  TitleDialogs,
  type TitleDialog,
} from "@/components/projects/titles/title-dialogs";
import type { ArtistChoices } from "@/components/projects/titles/title-forms";
import { TitlesFilter } from "@/components/projects/titles/titles-filter";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { TableSortProvider } from "@/components/ui/table-sort";
import { useSheetRow } from "@/components/ui/use-sheet-row";
import { todayInParis } from "@/lib/contracts/types";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { ContactState, TitleRecap } from "@/lib/projects/recap-rules";

export type {
  BoardLinks,
  TitleDepositLink,
} from "@/components/projects/titles/board-rows";

const fr = { projectTitles };

/**
 * « Titres » par artiste of a collective project, the team's Excel
 * (retours d'Ibé du 18/11/2026; Maël 22/11/2026: « une ligne, ça soit un
 * artiste »), redrawn by Sacha on 27/11/2026: one fact a column, each with
 * its icon — Artiste (the name alone, its alerts' icon), Rôle (when they
 * differ), Titre, Statut, Contact, Téléphone, Accord, Taux, Fiche, Contrat,
 * Mix, Sortie, Distribution, Beatmaker, Notes (board-columns.tsx) — every
 * state a dot and its word, and nothing edited in a cell: the artist's name
 * opens its side sheet (TitleArtistSheet), where its title, status,
 * contact, accord, fiche and note are read in full and changed; « ⋯ » keeps
 * the row's quick gestures (« Caler le call »…). Every column of the Excel
 * stays: wider than the page, the table scrolls inside its frame, Artiste
 * kept on the left. The filter keeps the artists of some statuses; the
 * abandoned titles come last, under « Abandonnés ». On a phone, a card a
 * row (BoardCards).
 */
export function TitlesBoard({
  projectId,
  recap,
  canManage,
  artists,
  masterOptions = {},
  links,
  notes = true,
  today = todayInParis(new Date()),
  views,
}: {
  projectId: string;
  recap: TitleRecap;
  canManage: boolean;
  artists: ArtistChoices;
  // The Catalogue's titles not in the project yet (« Rattacher un titre du
  // Catalogue », lot 7): id → « Titre · Artistes ».
  masterOptions?: Record<string, string>;
  links: BoardLinks;
  // The artists' notes, read and written; none on an overview.
  notes?: boolean;
  // Paris's day, read by the server (a waiver's due date, lot 12).
  today?: string;
  // « Par titre / Par artiste » (TitlesViewsSwitch): the filter button
  // sits beside them, on one line (Sacha 27/11/2026).
  views?: ReactNode;
}) {
  const t = fr.projectTitles.board;
  const [filter, setFilter] = useState<ContactState[]>([]);
  // A title's modal opened from a row's « ⋯ » (the sheet has its own).
  const [titleDialog, setTitleDialog] = useState<{
    titleId: string;
    dialog: TitleDialog;
  } | null>(null);
  const { live, abandoned } = boardRowsOf(recap, filter);
  const rows = [...live, ...abandoned];
  const [sheet, setSheet] = useSheetRow(rows.map((row) => row.id));

  const head = (
    <TitlesFilter
      views={views}
      recap={recap}
      filter={filter}
      onFilter={setFilter}
    />
  );
  if (recap.titles.length === 0)
    return (
      <div className="flex flex-col gap-[var(--stack-loose)]">
        {head}
        <EmptyState
          icon={IconDisc}
          title={t.empty.title}
          body={canManage ? t.empty.body : t.empty.readOnly}
        />
      </div>
    );

  const ctx: BoardContext = {
    projectId,
    links,
    canManage,
    canReadLegal: recap.canReadLegal,
    canEditNetwork: recap.canEditNetwork,
    call: recap.call,
    notes,
    today,
  };
  const columns = boardColumns({
    recap,
    projectId,
    links,
    roles: variedRoles(recap),
    notes,
  });
  const invitedOn = invitedOnOf(recap);
  // « ⋯ » for whoever writes the titles or may « Caler le call » on a row
  // (none for a reader: no empty column on the right).
  const withMenu =
    canManage || rows.some((row) => rowPlansCall(row, recap.call));
  const artist = (row: BoardRow) => (
    <ArtistName
      row={row}
      alerts={rowAlerts(row, ctx)}
      onOpen={() => setSheet(rows.indexOf(row))}
    />
  );
  const menu = withMenu
    ? (row: BoardRow) => (
        <BoardRowMenu
          projectId={projectId}
          row={row}
          canManage={canManage}
          call={recap.call}
          onTitleDialog={(dialog) =>
            setTitleDialog({ titleId: row.title.id, dialog })
          }
        />
      )
    : null;
  const abandonedHead = (
    <>
      {t.abandonedGroup}
      <span className="ml-1.5 font-medium text-[color:var(--text-tertiary)]">
        {new Set(abandoned.map((row) => row.title.id)).size}
      </span>
    </>
  );
  const parts = { live, abandoned, columns, artist, menu, abandonedHead };
  const dialogTitle = titleDialog
    ? recap.titles.find((title) => title.id === titleDialog.titleId)
    : undefined;

  // The table from 640 px of board, else its cards (a phone, Maël
  // 23/11/2026): both written, the board's width shows one (container
  // query), so that nothing jumps at load. One sort for the table and the
  // sheet: ↑ ↓ follow the rows as shown.
  return (
    <div className="flex flex-col gap-[var(--stack-loose)]">
      {head}
      <div className="@container/board">
        {rows.length === 0 ? (
          <EmptyNote>{fr.projectTitles.recap.filteredEmpty}</EmptyNote>
        ) : (
          <TableSortProvider>
            <div className="hidden @min-[40rem]/board:block">
              <BoardTable {...parts} />
            </div>
            <div className="@min-[40rem]/board:hidden">
              <BoardCards {...parts} />
            </div>
            <TitleArtistSheet
              rows={rows}
              index={sheet}
              onClose={() => setSheet(null)}
              onMove={setSheet}
              ctx={ctx}
              artists={artists}
              invitedOn={invitedOn}
              masterOptions={masterOptions}
            />
          </TableSortProvider>
        )}
      </div>
      {dialogTitle && titleDialog && (
        <TitleDialogs
          projectId={projectId}
          title={dialogTitle}
          label={dialogTitle.recap.label}
          artists={artists}
          invitedOn={invitedOn(dialogTitle.id)}
          masterOptions={masterOptions}
          canManage={canManage}
          credit={creditOf(dialogTitle)}
          dialog={titleDialog.dialog}
          onDialog={(dialog) =>
            setTitleDialog(dialog ? { ...titleDialog, dialog } : null)
          }
        />
      )}
    </div>
  );
}
