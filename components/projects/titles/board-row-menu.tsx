"use client";

import {
  creditOf,
  type BoardRow,
} from "@/components/projects/titles/board-rows";
import { plansCall } from "@/components/projects/titles/recap-edits";
import type { TitleDialog } from "@/components/projects/titles/title-dialogs";
import { TitleRowMenu } from "@/components/projects/titles/title-row-menu";
import { useTitleActions } from "@/components/projects/titles/use-title-actions";
import { RowActions } from "@/components/ui/row-actions";
import type { SharedNegotiationCall } from "@/lib/deals/negotiation-call-rules";
import { projectTitles } from "@/lib/i18n/fr/project-titles";

const fr = { projectTitles };

/** Whether a row may « Caler le call » (its « ⋯ » and its side sheet
 * offer it): its artist agreed, no call planned, its title not abandoned. */
export const rowPlansCall = (
  row: BoardRow,
  call: SharedNegotiationCall | null,
) =>
  row.title.status !== "abandoned" &&
  row.participation?.recap.accord != null &&
  plansCall(call, row.participation.recap.accord);

/**
 * « ⋯ » of a row (Maël 25/11/2026: no button in the table): « Caler le
 * call » when the row may plan it, the artist's gestures, then its title's
 * (`onTitleDialog` opens a title's modal, once for the board); a title
 * without an artist, its title's gestures alone. The same in the row's
 * side sheet, its bar.
 */
export function BoardRowMenu({
  projectId,
  row,
  canManage,
  call,
  onTitleDialog,
}: {
  projectId: string;
  row: BoardRow;
  canManage: boolean;
  call: SharedNegotiationCall | null;
  onTitleDialog: (dialog: TitleDialog) => void;
}) {
  const { title, participation } = row;
  const label = title.recap.label;
  const titleActions = useTitleActions({
    projectId,
    title,
    canManage,
    onDialog: onTitleDialog,
  });
  if (!participation)
    return (
      <RowActions label={fr.projectTitles.menu(label)} actions={titleActions} />
    );
  return (
    <TitleRowMenu
      projectId={projectId}
      participation={participation}
      label={label}
      credit={creditOf(title)}
      // Its title abandoned: not edited (reactivate it first).
      canManage={canManage && title.status !== "abandoned"}
      call={rowPlansCall(row, call) ? call : null}
      titleActions={titleActions}
    />
  );
}
