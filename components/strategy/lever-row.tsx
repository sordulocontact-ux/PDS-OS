"use client";

import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import {
  LeverStateControl,
  type LeverState,
} from "@/components/strategy/lever-state-control";
import { optionClass } from "@/components/ui/option-class";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { legalWordOf } from "@/lib/strategy/legal-items";
import type { Lever } from "@/lib/strategy/queries";
import { leverTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

type Patch = {
  state?: LeverState;
  review_status?: "confirmed" | "rejected";
};

/**
 * One lever: its name, the need it answers, its source, and its state. A
 * lever proposed from a call is confirmed or rejected first; then the owner
 * sets Retenu / À arbitrer / Non retenu. A reader sees the state only.
 */
export function LeverRow({
  lever,
  canEdit,
  pending,
  onPatch,
}: {
  lever: Lever;
  canEdit: boolean;
  pending: boolean;
  onPatch: (patch: Patch) => void;
}) {
  const t = fr.strategy.levers;
  const a = fr.framing.actions;
  const state = lever.state as LeverState;
  const proposed = lever.review_status === "proposed";
  // MKT-S1-07: a lever written before the rule, said and easy to move out.
  const legalWord = legalWordOf(lever.label);

  return (
    <li
      className={cn(
        optionClass(state === "selected" && !proposed),
        "flex-col sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "font-semibold break-words",
              state === "rejected" && "text-muted-foreground line-through",
            )}
          >
            {lever.label}
          </span>
          {proposed && <ProposedBadge />}
          {!canEdit && (
            <StatusBadge tone={leverTone[state]} size="sm">
              {fr.strategy.levers.states[state]}
            </StatusBadge>
          )}
        </div>
        {lever.needLabel && (
          <span className="text-caption text-muted-foreground">
            {t.fromNeed(lever.needLabel)}
          </span>
        )}
        {lever.provenance && <ProvenanceNote provenance={lever.provenance} />}
        {legalWord && state !== "rejected" && (
          <span className="flex flex-wrap items-center gap-2 text-caption text-[color:var(--text-secondary)]">
            {fr.strategyDispositif.legal.flagged(legalWord)}
            {canEdit && (
              <Button
                size="xs"
                variant="outline"
                disabled={pending}
                onClick={() => onPatch({ state: "rejected" })}
              >
                {fr.strategyDispositif.legal.remove}
              </Button>
            )}
          </span>
        )}
      </div>
      {canEdit &&
        (proposed ? (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => onPatch({ review_status: "rejected" })}
            >
              {a.reject}
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => onPatch({ review_status: "confirmed" })}
            >
              {a.confirm}
            </Button>
          </div>
        ) : (
          <div className="shrink-0">
            <LeverStateControl
              lever={lever.label}
              value={state}
              disabled={pending}
              onChange={(next) => onPatch({ state: next })}
            />
          </div>
        ))}
    </li>
  );
}
