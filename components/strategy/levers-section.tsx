"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import {
  labelClass,
  optionClass,
  sectionTitleClass,
} from "@/components/strategy/option-class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import {
  addLever,
  leverFromNeed,
  updateLever,
} from "@/lib/strategy/actions/levers";
import type { StrategyData } from "@/lib/strategy/queries";
import { leverTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

type Family = keyof typeof fr.framing.needs.families;
type LeverState = keyof typeof fr.strategy.levers.states;

/**
 * The launch plan's levers, by family (the same closed taxonomy as needs). A
 * selected lever is a blue card: it is the one that carries deliverables.
 */
export function LeversSection({
  levers,
  openNeeds,
  projectId,
}: Pick<StrategyData, "levers" | "openNeeds"> & { projectId: string }) {
  const t = fr.strategy.levers;
  const a = fr.framing.actions;
  const families = fr.framing.needs.families;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [label, setLabel] = useState("");
  const [family, setFamily] = useState<Family>("creation_content");

  const byFamily = (Object.keys(families) as Family[])
    .map((key) => ({ key, items: levers.filter((l) => l.family === key) }))
    .filter((group) => group.items.length > 0);

  return (
    <section aria-labelledby="levers-title" className="flex flex-col gap-6">
      <h3 id="levers-title" className={sectionTitleClass}>
        {t.title}
      </h3>

      {byFamily.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        byFamily.map((group) => (
          <div key={group.key} className="flex flex-col gap-3">
            <p className={labelClass}>{families[group.key]}</p>
            <ul className="flex flex-col gap-3">
              {group.items.map((lever) => {
                const state = lever.state as LeverState;
                const proposed = lever.review_status === "proposed";
                return (
                  <li
                    key={lever.id}
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
                            state === "rejected" &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {lever.label}
                        </span>
                        {proposed && <ProposedBadge />}
                        {!canEdit && (
                          <StatusBadge tone={leverTone[state]} size="sm">
                            {t.states[state]}
                          </StatusBadge>
                        )}
                      </div>
                      {lever.needLabel && (
                        <span className="text-caption text-muted-foreground">
                          {t.fromNeed(lever.needLabel)}
                        </span>
                      )}
                      {lever.provenance && (
                        <ProvenanceNote provenance={lever.provenance} />
                      )}
                    </div>
                    {canEdit &&
                      (proposed ? (
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() =>
                              run(() =>
                                updateLever(projectId, lever.id, {
                                  review_status: "rejected",
                                }),
                              )
                            }
                          >
                            {a.reject}
                          </Button>
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(() =>
                                updateLever(projectId, lever.id, {
                                  review_status: "confirmed",
                                }),
                              )
                            }
                          >
                            {a.confirm}
                          </Button>
                        </div>
                      ) : (
                        <div className="shrink-0">
                          <OptionSelect
                            id={`lever-state-${lever.id}`}
                            label={`${t.state} — ${lever.label}`}
                            options={t.states}
                            value={state}
                            disabled={pending}
                            onChange={(next) =>
                              run(() =>
                                updateLever(projectId, lever.id, {
                                  state: next as LeverState,
                                }),
                              )
                            }
                          />
                        </div>
                      ))}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}

      {canEdit && openNeeds.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className={labelClass}>{t.needsTitle}</p>
          <div className="flex flex-wrap gap-2">
            {openNeeds.map((need) => (
              <Button
                key={need.id}
                variant="outline"
                disabled={pending}
                title={t.fromNeedAction}
                onClick={() => run(() => leverFromNeed(projectId, need.id))}
              >
                <IconPlus aria-hidden />
                {need.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => addLever(projectId, label, family),
              () => setLabel(""),
            );
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Label htmlFor="lever-label" required className={labelClass}>
              {t.label}
            </Label>
            <Input
              id="lever-label"
              aria-required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lever-family" required className={labelClass}>
              {t.family}
            </Label>
            <OptionSelect
              id="lever-family"
              required
              label={t.family}
              options={families}
              value={family}
              onChange={(v) => setFamily(v as Family)}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={pending || label.trim() === ""}
          >
            {a.add}
          </Button>
        </form>
      )}
    </section>
  );
}
