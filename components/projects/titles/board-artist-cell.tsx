"use client";

import { IconTriangleWarning } from "nucleo-sharp-essential";

import {
  isActiveRow,
  type BoardRow,
} from "@/components/projects/titles/board-rows";
import { muted } from "@/components/projects/titles/recap-facts";
import { DataTableLink } from "@/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { cn } from "@/lib/utils";

const fr = { projectTitles };

/** An artist's alerts (credits to check, contract not signed, waivers)
 * as one icon right after its name, their words in a tooltip and for a
 * screen reader, in toutes lettres in its side sheet. `strong`: one waits
 * for the contract, in the warning's ink. */
export function AlertsIcon({
  alerts,
  strong,
}: {
  alerts: string[];
  strong: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`${fr.projectTitles.board.alerts} : ${alerts.join(". ")}`}
            className={cn(
              "relative z-10 inline-flex shrink-0 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]",
              strong
                ? "text-[color:var(--tone-warning-fg)]"
                : "text-[color:var(--text-tertiary)]",
            )}
          />
        }
      >
        <IconTriangleWarning aria-hidden className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="flex flex-col gap-0.5">
          {alerts.map((alert) => (
            <span key={alert}>{alert}</span>
          ))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/** The artist's name alone, opening its side sheet (the whole row is the
 * link, DataTableLink `onOpen`), its alerts' icon after it; greyed when
 * the artist is out of play (declined, withdrawn, its title abandoned). A
 * title without an artist: « Aucun artiste invité ». */
export function ArtistName({
  row,
  alerts,
  onOpen,
}: {
  row: BoardRow;
  alerts: { alerts: string[]; strong: boolean };
  onOpen: () => void;
}) {
  if (!row.participation)
    return (
      <span className={cn(muted, "block truncate")}>
        {fr.projectTitles.board.noArtist}
      </span>
    );
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        !isActiveRow(row) && "text-[color:var(--text-secondary)]",
      )}
    >
      <DataTableLink href={null} onOpen={onOpen}>
        {row.participation.artist.name}
      </DataTableLink>
      {alerts.alerts.length > 0 && (
        <AlertsIcon alerts={alerts.alerts} strong={alerts.strong} />
      )}
    </span>
  );
}
