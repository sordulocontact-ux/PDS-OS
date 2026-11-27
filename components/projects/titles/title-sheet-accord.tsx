"use client";

import {
  IconCalendarDays,
  IconDiscount,
  IconPhone,
  IconScale,
  IconUser,
} from "nucleo-sharp-essential";
import { useState } from "react";

import { rowPlansCall } from "@/components/projects/titles/board-row-menu";
import type {
  BoardContext,
  BoardRow,
} from "@/components/projects/titles/board-rows";
import { PlanCallDialog } from "@/components/projects/titles/recap-edits";
import { AccordStage } from "@/components/projects/titles/recap-facts";
import { Button } from "@/components/ui/button";
import {
  SheetBlock,
  SheetLine,
  SheetLines,
} from "@/components/ui/record-sheet";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { RecapParticipation } from "@/lib/projects/recap-rules";
import { formatShortDay } from "@/lib/utils/day";

const fr = { dealCalls, projectTitles };

type Props = { row: BoardRow & { participation: RecapParticipation } };

/** « Accord » (the Business module): its deal's stage (to the deal), the
 * rate, the next call and who negotiates; « Caler le call » when the row
 * may plan it. Absent when the reader sees no deal, or nothing is known. */
export function AccordBlock({ row, ctx }: Props & { ctx: BoardContext }) {
  const s = fr.projectTitles.board.sheet;
  const accord = row.participation.recap.accord;
  const [calling, setCalling] = useState(false);
  const plan = rowPlansCall(row, ctx.call);
  if (!accord || (!accord.stage && !plan)) return null;
  const negotiator =
    accord.negotiator ??
    (accord.href && accord.stage && accord.stage !== "abandoned"
      ? fr.projectTitles.board.negotiation.unassigned
      : null);
  return (
    <SheetBlock title={s.blocks.accord}>
      <SheetLines>
        {accord.stage && (
          <SheetLine icon={IconScale} label={s.lines.stage}>
            <AccordStage
              accord={accord}
              artist={row.participation.artist.name}
            />
          </SheetLine>
        )}
        {accord.rate && (
          <SheetLine icon={IconDiscount} label={s.lines.rate}>
            {accord.rate}
          </SheetLine>
        )}
        {accord.nextCallAt && (
          <SheetLine icon={IconCalendarDays} label={s.lines.nextCall}>
            {formatShortDay(accord.nextCallAt, { bare: true })}
          </SheetLine>
        )}
        {negotiator && (
          <SheetLine icon={IconUser} label={s.lines.negotiator}>
            {negotiator}
          </SheetLine>
        )}
      </SheetLines>
      {plan && (
        <div className="flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCalling(true)}
          >
            <IconPhone aria-hidden data-icon="inline-start" />
            {fr.dealCalls.negotiation.button}
          </Button>
          <PlanCallDialog
            shared={ctx.call}
            accord={accord}
            open={calling}
            onOpenChange={setCalling}
          />
        </div>
      )}
    </SheetBlock>
  );
}
