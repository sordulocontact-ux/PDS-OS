"use client";

import { IconCircleInfo } from "nucleo-sharp-essential";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusDot } from "@/components/ui/status-dot";
import { fr } from "@/lib/i18n/fr";
import { workflowStatusTone } from "@/lib/ui/state-tones";

const STATUSES = [
  "not_started",
  "in_progress",
  "waiting",
  "blocked",
  "done",
] as const;

/** What the dots of the workflows mean, beside their heading (UX test of
 * 09/10/2026: grey dots without a legend). */
export function WorkflowLegend() {
  const t = fr.workflowStatus;
  return (
    <Popover>
      <PopoverTrigger
        aria-label={t.legend.open}
        className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-[color:var(--nav-fg-muted)] hover:bg-[var(--nav-item-hover-bg)]"
      >
        <IconCircleInfo aria-hidden className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 gap-3 p-4">
        <p className="text-body-md font-medium">{t.legend.title}</p>
        <ul className="flex flex-col gap-2">
          {STATUSES.map((status) => (
            <li key={status}>
              <StatusDot
                tone={workflowStatusTone[status]}
                label={t.statuses[status]}
                showLabel
              />
            </li>
          ))}
        </ul>
        <p className="text-caption text-muted-foreground">{t.legend.start}</p>
      </PopoverContent>
    </Popover>
  );
}
