"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
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
import { leverTreatment } from "@/lib/ui/state-treatments";
import { cn } from "@/lib/utils";

type Family = keyof typeof fr.framing.needs.families;
type LeverState = keyof typeof fr.strategy.levers.states;

/** The launch plan's levers, by family (the same closed taxonomy as needs). */
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
    <section className="grid gap-4 py-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-medium">{t.title}</h3>
        <p className="text-xs text-muted-foreground">{t.hint}</p>
      </div>

      {byFamily.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        byFamily.map((group) => (
          <div key={group.key} className="grid gap-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              {families[group.key]}
            </h4>
            <ul className="grid gap-2">
              {group.items.map((lever) => {
                const state = lever.state as LeverState;
                const proposed = lever.review_status === "proposed";
                return (
                  <li
                    key={lever.id}
                    className="grid gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          state === "rejected" && "text-muted-foreground",
                        )}
                      >
                        {lever.label}
                      </span>
                      <StatusBadge treatment={leverTreatment[state]} size="sm">
                        {t.states[state]}
                      </StatusBadge>
                      {proposed && <ProposedBadge />}
                    </div>
                    {lever.needLabel && (
                      <p className="text-xs text-muted-foreground">
                        {t.fromNeed(lever.needLabel)}
                      </p>
                    )}
                    {lever.provenance && (
                      <ProvenanceNote
                        provenance={lever.provenance}
                        projectId={projectId}
                      />
                    )}
                    {canEdit &&
                      (proposed ? (
                        <div className="flex flex-wrap gap-2">
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
                          <Button
                            size="sm"
                            variant="outline"
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
                        </div>
                      ) : (
                        <div className="justify-self-start">
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
        <div className="grid gap-2 rounded-lg border border-dashed border-border p-3">
          <div className="grid gap-0.5">
            <p className="text-xs font-medium">{t.needsTitle}</p>
            <p className="text-xs text-muted-foreground">{t.needsHint}</p>
          </div>
          <ul className="grid gap-2">
            {openNeeds.map((need) => (
              <li
                key={need.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  {need.label}
                  <span className="text-muted-foreground">
                    {" · "}
                    {families[need.family as Family]}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => leverFromNeed(projectId, need.id))}
                >
                  {t.fromNeedAction}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canEdit && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => addLever(projectId, label, family),
              () => setLabel(""),
            );
          }}
        >
          <div className="grid min-w-56 flex-1 gap-1">
            <Label htmlFor="lever-label">{t.label}</Label>
            <Input
              id="lever-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="lever-family">{t.family}</Label>
            <OptionSelect
              id="lever-family"
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
