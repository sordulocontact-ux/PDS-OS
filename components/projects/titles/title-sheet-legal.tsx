"use client";

import {
  IconClipboard,
  IconHandshake,
  IconPenWriting2,
  IconTriangleWarning,
} from "nucleo-sharp-essential";
import { useState } from "react";

import {
  rowAlerts,
  type BoardContext,
  type BoardRow,
} from "@/components/projects/titles/board-rows";
import { NoteDialog } from "@/components/projects/titles/recap-edits";
import {
  ContractFacts,
  FichePill,
  caption,
  contractStatePill,
} from "@/components/projects/titles/recap-facts";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import {
  SheetBlock,
  SheetLine,
  SheetLines,
} from "@/components/ui/record-sheet";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { RecapParticipation } from "@/lib/projects/recap-rules";
import { cn } from "@/lib/utils";

const fr = { projectTitles };

type Props = {
  row: BoardRow & { participation: RecapParticipation };
  ctx: BoardContext;
};

/** « Juridique »: the artist's fiche de renseignement and contract (each
 * to its démarche, with manage_legal), then its alerts in toutes lettres
 * (credits to check, contract not signed, waivers), the warning's ink for
 * the contract awaited. Absent when there is nothing to say. */
export function LegalBlock({ row, ctx }: Props) {
  const s = fr.projectTitles.board.sheet;
  const { fiche } = row.participation.recap;
  // A contract expected or linked; none yet (proposed, invited): no line.
  const contract =
    row.participation.recap.contract &&
    contractStatePill(row.participation.recap.contract.state, true)
      ? row.participation.recap.contract
      : null;
  const { alerts, strong } = rowAlerts(row, ctx);
  if (!fiche && !contract && alerts.length === 0) return null;
  return (
    <SheetBlock title={s.blocks.legal}>
      {(fiche || contract) && (
        <SheetLines>
          {fiche && (
            <SheetLine icon={IconClipboard} label={s.lines.fiche}>
              <FichePill fiche={fiche} name={row.participation.artist.name} />
            </SheetLine>
          )}
          {contract && (
            <SheetLine icon={IconHandshake} label={s.lines.contract}>
              <ContractFacts contract={contract} />
            </SheetLine>
          )}
        </SheetLines>
      )}
      {alerts.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {alerts.map((alert) => (
            <li
              key={alert}
              className={cn(
                caption,
                "flex items-start gap-1.5 text-[color:var(--text-secondary)]",
                // The contract awaited, in the warning's ink.
                strong &&
                  alert === fr.projectTitles.recap.contractMissing &&
                  "text-[color:var(--tone-warning-fg)]",
              )}
            >
              <IconTriangleWarning
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
              />
              {alert}
            </li>
          ))}
        </ul>
      )}
    </SheetBlock>
  );
}

/** « Notes »: the artist's note in full, changed by the pencil; « Ajouter
 * une note » while there is none, for whoever writes the title. Absent on
 * an overview (`notes` false) and for a reader without a note. */
export function NotesBlock({ row, ctx }: Props) {
  const s = fr.projectTitles.board.sheet;
  const t = fr.projectTitles.recap.note;
  const { participation: p } = row;
  const note = p.recap.note;
  const canEdit = ctx.canManage && row.title.status !== "abandoned";
  const [open, setOpen] = useState(false);
  if (!ctx.notes || (!note && !canEdit)) return null;
  return (
    <SheetBlock
      title={s.blocks.notes}
      aside={
        note &&
        canEdit && (
          <IconAction
            label={t.edit(p.artist.name)}
            icon={IconPenWriting2}
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(true)}
          />
        )
      }
    >
      {note ? (
        <p className="break-words whitespace-pre-line">{note}</p>
      ) : (
        <div className="flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            {s.addNote}
          </Button>
        </div>
      )}
      {canEdit && (
        <NoteDialog
          open={open}
          onOpenChange={setOpen}
          projectId={ctx.projectId}
          participationId={p.id}
          artist={p.artist.name}
          note={note}
        />
      )}
    </SheetBlock>
  );
}
