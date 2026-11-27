"use client";

import {
  IconBoxArchive,
  IconCalendarStar,
  IconPaperPlane2,
  IconPenWriting2,
  IconUsers2,
  IconVolumeUp,
} from "nucleo-sharp-essential";
import { useOptimistic, useTransition } from "react";

import { IconDisc } from "@/components/icons";
import {
  isUnnamed,
  masterHrefOf,
  titleHrefOf,
  type BoardContext,
  type BoardRow,
} from "@/components/projects/titles/board-rows";
import { ReleaseChoice } from "@/components/projects/titles/recap-edits";
import {
  releaseValueOf,
  type ReleaseValue,
} from "@/components/projects/titles/recap-edits-words";
import { MixPill, PILL_LINK } from "@/components/projects/titles/recap-facts";
import type { TitleDialog } from "@/components/projects/titles/title-dialogs";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import {
  SheetBlock,
  SheetLine,
  SheetLines,
} from "@/components/ui/record-sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { ViewLink } from "@/components/ui/view-link";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { setTitleRelease } from "@/lib/projects/title-actions";
import { titleMixFact } from "@/lib/projects/title-board-rules";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";

const fr = { projectTitles };

const SHEET_NAME_LINK =
  "min-w-0 rounded-sm break-words underline-offset-2 outline-none hover:underline focus-visible:underline";

/** The top of a row's side sheet: the artist's name large, its role and
 * its title under it; a title without an artist, its label and « Aucun
 * artiste invité », with « Ajouter un artiste » for whoever writes. */
export function SheetIdentity({
  row,
  onAdd,
}: {
  row: BoardRow;
  onAdd?: () => void;
}) {
  const t = fr.projectTitles;
  const p = row.participation;
  const label = row.title.recap.label;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-display-sm font-medium break-words">
          {p ? p.artist.name : label}
        </p>
        <p className="text-[color:var(--text-secondary)]">
          {p
            ? t.board.sheet.identity(t.participations.roles[p.role], label)
            : t.board.noArtist}
        </p>
      </div>
      {onAdd && (
        <div className="flex">
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            {t.participations.add.action}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * « Titre »: its name (to its page; « Nommer » while it has none, Ibé
 * 18/11, 37:03), why it was abandoned, then what the title's rows share and
 * the table no longer repeats on each artist (one fact a column, Sacha
 * 27/11/2026): its Mix (to its Master), its Sortie (changed here), its
 * Distribution, its beatmakers. Renamed by the pencil of the block.
 */
export function TitleBlock({
  row,
  ctx,
  onDialog,
}: {
  row: BoardRow;
  ctx: BoardContext;
  onDialog: (dialog: TitleDialog) => void;
}) {
  const t = fr.projectTitles;
  const l = t.board.sheet.lines;
  const { title } = row;
  const abandoned = title.status === "abandoned";
  const canEdit = ctx.canManage && !abandoned;
  const unnamed = isUnnamed(title);
  const label = title.recap.label;
  const href = titleHrefOf(ctx.projectId, title, ctx.links);
  const mix = abandoned ? null : titleMixFact(title.masterState);
  const distribution = ctx.links.distribution?.[title.id] ?? null;
  const beatmakers = title.recap.beatmakers.map((b) => b.name).join(", ");
  const [release, setRelease] = useOptimistic(title.recap.releaseDecision);
  const [pending, startRelease] = useTransition();
  const pickRelease = (value: ReleaseValue) =>
    startRelease(async () => {
      const next = value === "yes" ? true : value === "no" ? false : null;
      setRelease(next);
      const result = await setTitleRelease({
        projectId: ctx.projectId,
        titleId: title.id,
        release: next,
      });
      if (!result.ok) toast.error(result.error);
    });
  const ink = unnamed
    ? "text-[color:var(--text-tertiary)]"
    : "text-[color:var(--text-primary)]";

  return (
    <SheetBlock
      title={t.board.sheet.blocks.title}
      aside={
        canEdit &&
        !unnamed && (
          <IconAction
            label={t.recap.titleActions.rename}
            icon={IconPenWriting2}
            variant="ghost"
            size="icon-sm"
            onClick={() => onDialog("rename")}
          />
        )
      }
    >
      <SheetLines>
        <SheetLine icon={IconDisc} label={t.recap.columns.title}>
          <span className="flex min-w-0 items-center gap-3">
            {/* Whole, on as many lines as it takes (not a cell). */}
            {href ? (
              <ViewLink href={href} className={cn(SHEET_NAME_LINK, ink)}>
                {label}
              </ViewLink>
            ) : (
              <span className={cn("min-w-0 break-words", ink)}>{label}</span>
            )}
            {canEdit && unnamed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDialog("name")}
              >
                {t.recap.name.action}
              </Button>
            )}
          </span>
        </SheetLine>
        {abandoned && title.abandonedAt && title.abandonReason && (
          <SheetLine icon={IconBoxArchive} label={l.abandoned}>
            {t.abandonedOn(
              formatShortDay(title.abandonedAt, { bare: true }),
              title.abandonReason,
            )}
          </SheetLine>
        )}
        {mix && (
          <SheetLine icon={IconVolumeUp} label={l.mix}>
            <MixPill
              label={mix.label}
              status={mix.status}
              href={masterHrefOf(title, ctx.links)}
            />
          </SheetLine>
        )}
        <SheetLine icon={IconCalendarStar} label={l.release}>
          <ReleaseChoice
            label={label}
            value={releaseValueOf(release)}
            canEdit={canEdit}
            pending={pending}
            onPick={pickRelease}
          />
        </SheetLine>
        {distribution && (
          <SheetLine icon={IconPaperPlane2} label={l.distribution}>
            <ViewLink href={distribution.href} className={PILL_LINK}>
              <StatusBadge tone={distribution.tone} size="sm">
                {distribution.label}
              </StatusBadge>
            </ViewLink>
          </SheetLine>
        )}
        {beatmakers && (
          <SheetLine icon={IconUsers2} label={l.beatmaker}>
            {beatmakers}
          </SheetLine>
        )}
      </SheetLines>
    </SheetBlock>
  );
}
