"use client";

import { IconMicrophone } from "nucleo-sharp-essential";
import { Fragment, useState } from "react";

import { IconDisc } from "@/components/icons";
import { BoardRowMenu } from "@/components/projects/titles/board-row-menu";
import {
  creditOf,
  type BoardContext,
  type BoardRow,
} from "@/components/projects/titles/board-rows";
import {
  TitleDialogs,
  type TitleDialog,
} from "@/components/projects/titles/title-dialogs";
import type { ArtistChoices } from "@/components/projects/titles/title-forms";
import { AccordBlock } from "@/components/projects/titles/title-sheet-accord";
import {
  ContactBlock,
  StatusBlock,
} from "@/components/projects/titles/title-sheet-artist";
import {
  LegalBlock,
  NotesBlock,
} from "@/components/projects/titles/title-sheet-legal";
import {
  SheetIdentity,
  TitleBlock,
} from "@/components/projects/titles/title-sheet-title";
import { SideSheet } from "@/components/ui/side-sheet";

/**
 * An artist on a title, opened from its name in « Titres » par artiste
 * (Sacha 27/11/2026: one fact a column, nothing edited in the table), in
 * the side sheet of a record (docs/STYLE-FINANCE-PARTOUT.md § 6.7 bis, the
 * Réseau's ContactSheet): the bar (the artist, « ⋯ » of its row), its name,
 * role and title, then titled blocks, each absent when empty — Titre
 * (« Nommer », its Mix, Sortie, Distribution, beatmakers), Statut, Contact
 * (« Appeler », « WhatsApp »), Accord (« Caler le call »), Juridique (its
 * alerts in words), Notes — each changed by its own gesture, in the forms
 * of the board. Everything is already in the row: shown at once, nothing to
 * read when it opens. ↑ ↓ go to the next row as the table shows them. A
 * title without an artist: its title, and « Ajouter un artiste ».
 */
export function TitleArtistSheet({
  rows,
  index,
  onClose,
  onMove,
  ctx,
  artists,
  invitedOn,
  masterOptions,
}: {
  // Every row of the table, in its own order.
  rows: BoardRow[];
  // The open row, null when the sheet is closed.
  index: number | null;
  onClose: () => void;
  onMove: (to: number) => void;
  ctx: BoardContext;
  artists: ArtistChoices;
  // Where each artist is already invited, for « Ajouter un artiste ».
  invitedOn: (titleId: string) => Record<string, string[]>;
  masterOptions: Record<string, string>;
}) {
  // The title's modals, opened from the sheet (inside it: a modal opened
  // over the sheet keeps the focus).
  const [dialog, setDialog] = useState<TitleDialog | null>(null);
  const row = index === null ? null : (rows[index] ?? null);
  if (!row || index === null) return null;
  const { title, participation } = row;
  const label = title.recap.label;
  const canAdd =
    ctx.canManage &&
    title.status !== "abandoned" &&
    Object.keys(artists.options).length > 0;

  return (
    <SideSheet
      open
      onClose={onClose}
      title={participation ? participation.artist.name : label}
      index={index}
      total={rows.length}
      onMove={onMove}
      bar={{
        icon: participation ? IconMicrophone : IconDisc,
        actions: (
          <BoardRowMenu
            projectId={ctx.projectId}
            row={row}
            canManage={ctx.canManage}
            call={ctx.call}
            onTitleDialog={setDialog}
          />
        ),
      }}
    >
      {/* Its own state per row: ↑ ↓ start the next one afresh. */}
      <Fragment key={row.id}>
        <SheetIdentity
          row={row}
          onAdd={!participation && canAdd ? () => setDialog("add") : undefined}
        />
        <TitleBlock row={row} ctx={ctx} onDialog={setDialog} />
        {participation && (
          <>
            <StatusBlock row={{ ...row, participation }} ctx={ctx} />
            <ContactBlock row={{ ...row, participation }} ctx={ctx} />
            <AccordBlock row={{ ...row, participation }} ctx={ctx} />
            <LegalBlock row={{ ...row, participation }} ctx={ctx} />
            <NotesBlock row={{ ...row, participation }} ctx={ctx} />
          </>
        )}
        <TitleDialogs
          projectId={ctx.projectId}
          title={title}
          label={label}
          artists={artists}
          invitedOn={invitedOn(title.id)}
          masterOptions={masterOptions}
          canManage={ctx.canManage}
          credit={creditOf(title)}
          dialog={dialog}
          onDialog={setDialog}
        />
      </Fragment>
    </SideSheet>
  );
}
