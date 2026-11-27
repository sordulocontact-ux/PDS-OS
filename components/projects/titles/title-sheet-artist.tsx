"use client";

import {
  IconMsgs,
  IconNodes,
  IconPenWriting2,
  IconPhone,
  IconSuitcase5,
} from "nucleo-sharp-essential";
import { useState } from "react";

import {
  creditOf,
  type BoardContext,
  type BoardRow,
} from "@/components/projects/titles/board-rows";
import {
  ContactDialog,
  contactModes,
} from "@/components/projects/titles/recap-contact-dialog";
import {
  ContactStatePill,
  muted,
} from "@/components/projects/titles/recap-facts";
import { ParticipationStatusForm } from "@/components/projects/titles/title-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { EMPTY_CELL } from "@/components/ui/data-table";
import { DialogButton } from "@/components/ui/dialog-button";
import { IconAction } from "@/components/ui/icon-action";
import { ViewLink } from "@/components/ui/view-link";
import {
  SHEET_LINK,
  SheetBlock,
  SheetLine,
  SheetLines,
} from "@/components/ui/record-sheet";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { RecapParticipation } from "@/lib/projects/recap-rules";
import { telHref, whatsappHref } from "@/lib/utils/phone";

const fr = { projectTitles };

type Props = { row: BoardRow & { participation: RecapParticipation } };

/** « Statut »: where the artist stands, a dot and its word, changed by the
 * pencil (its modal) for whoever writes the title. */
export function StatusBlock({ row, ctx }: Props & { ctx: BoardContext }) {
  const t = fr.projectTitles.participations;
  const { participation: p, title } = row;
  const credit = creditOf(title);
  const label = title.recap.label;
  return (
    <SheetBlock
      title={fr.projectTitles.board.sheet.blocks.status}
      aside={
        ctx.canManage &&
        title.status !== "abandoned" && (
          <DialogButton
            label={t.status.action}
            icon={IconPenWriting2}
            iconOnly
            variant="ghost"
            iconSize="icon-sm"
            title={t.status.title(p.artist.name, label)}
            description={t.status.description(credit.mode, credit.shared) ?? ""}
          >
            {(close) => (
              <ParticipationStatusForm
                projectId={ctx.projectId}
                participation={p}
                onDone={close}
              />
            )}
          </DialogButton>
        )
      }
    >
      <div className="flex">
        <ContactStatePill status={p.status} />
      </div>
    </SheetBlock>
  );
}

/** « Contact »: who to call for the artist (its role, name, number), then
 * « Appeler » and « WhatsApp »; changed or taken from the Réseau by the
 * pencil, « Ajouter le contact » while there is none. Absent with nothing
 * to read nor do. */
export function ContactBlock({ row, ctx }: Props & { ctx: BoardContext }) {
  const s = fr.projectTitles.board.sheet;
  const c = fr.projectTitles.recap.contact;
  const { participation: p } = row;
  const contact = p.recap.contact;
  const abandoned = row.title.status === "abandoned";
  const modes = contactModes({
    contact,
    canManage: ctx.canManage && !abandoned,
    canEditNetwork: ctx.canEditNetwork && !abandoned,
  });
  const [open, setOpen] = useState(false);
  if (!contact && modes.length === 0) return null;
  const phone = contact && !contact.hidden ? contact.phone : null;
  const whatsapp = phone ? whatsappHref(phone) : null;
  return (
    <SheetBlock
      title={s.blocks.contact}
      aside={
        contact &&
        modes.length > 0 && (
          <IconAction
            label={c.edit(p.artist.name)}
            icon={IconPenWriting2}
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(true)}
          />
        )
      }
    >
      {contact ? (
        <>
          <SheetLines>
            <SheetLine icon={IconSuitcase5} label={s.lines.role}>
              {contact.role ?? c.label}
            </SheetLine>
            <SheetLine icon={IconNodes} label={s.lines.name}>
              <ViewLink href={contact.href} className={SHEET_LINK}>
                {contact.name}
              </ViewLink>
            </SheetLine>
            <SheetLine icon={IconPhone} label={s.lines.phone}>
              {contact.hidden ? (
                <span className={muted}>{c.hidden}</span>
              ) : phone ? (
                <a href={telHref(phone)} className={SHEET_LINK}>
                  {phone}
                </a>
              ) : (
                <span className={muted}>{EMPTY_CELL}</span>
              )}
            </SheetLine>
          </SheetLines>
          {phone && (
            <div className="flex flex-wrap gap-2">
              <a
                href={telHref(phone)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <IconPhone aria-hidden data-icon="inline-start" />
                {s.call}
              </a>
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <IconMsgs aria-hidden data-icon="inline-start" />
                  {s.whatsapp}
                </a>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            {s.addContact}
          </Button>
        </div>
      )}
      <ContactDialog
        open={open}
        onOpenChange={setOpen}
        projectId={ctx.projectId}
        participationId={p.id}
        contact={contact}
        modes={modes}
      />
    </SheetBlock>
  );
}
