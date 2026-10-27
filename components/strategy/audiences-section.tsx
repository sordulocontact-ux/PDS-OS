"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { AudienceForm } from "@/components/strategy/audience-form";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { removeAudience } from "@/lib/strategy/actions/audiences";
import type { StrategyAudience } from "@/lib/strategy/queries";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";

const fr = { strategyPilot };

/**
 * The publics, one card each (MKT-S1-05): segment, priority, need or
 * insight, channel foreseen; what is missing is said on the card. The
 * closed choices already ticked are offered as publics to describe.
 */
export function AudiencesSection({
  projectId,
  audiences,
  suggested,
}: {
  projectId: string;
  audiences: StrategyAudience[];
  // The ticked closed choices with no public of that name yet.
  suggested: string[];
}) {
  const t = fr.strategyPilot.audiences;
  const canEdit = useCanEditProject();
  const { run } = useFramingAction();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="audiences-title">
      <h3 id="audiences-title" className="text-body-md font-semibold">
        {t.title}
      </h3>
      {audiences.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}
      <ul className="flex flex-col gap-3">
        {audiences.map((a) =>
          editing === a.id ? (
            <li
              key={a.id}
              id={`audience-${a.id}`}
              className="rounded-[var(--radius-lg)] border border-[color:var(--border-default)] p-4"
            >
              <AudienceForm
                projectId={projectId}
                audience={a}
                onDone={() => setEditing(null)}
              />
            </li>
          ) : (
            <li
              key={a.id}
              id={`audience-${a.id}`}
              className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.segment}</span>
                  <StatusBadge
                    tone={a.priority === "primary" ? "info" : "neutral"}
                    size="sm"
                  >
                    {
                      t.priorities[
                        a.priority === "secondary" ? "secondary" : "primary"
                      ]
                    }
                  </StatusBadge>
                </span>
                {canEdit && (
                  <span className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setEditing(a.id)}
                    >
                      {t.edit}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => run(() => removeAudience(projectId, a.id))}
                    >
                      {t.remove}
                    </Button>
                  </span>
                )}
              </div>
              <p className="text-sm">
                <span className="text-[color:var(--text-secondary)]">
                  {t.insight} :{" "}
                </span>
                {a.insight ?? (
                  <span className="text-[color:var(--text-tertiary)]">
                    {t.toFill}
                  </span>
                )}
              </p>
              <p className="text-sm">
                <span className="text-[color:var(--text-secondary)]">
                  {t.channel} :{" "}
                </span>
                {a.channel ?? (
                  <span className="text-[color:var(--text-tertiary)]">
                    {t.toFill}
                  </span>
                )}
              </p>
            </li>
          ),
        )}
      </ul>
      {canEdit &&
        (adding !== null ? (
          <div
            id="audience-new"
            className="rounded-[var(--radius-lg)] border border-[color:var(--border-default)] p-4"
          >
            <AudienceForm
              projectId={projectId}
              audience={null}
              defaultSegment={adding}
              onDone={() => setAdding(null)}
            />
          </div>
        ) : (
          <div id="audience-new" className="flex flex-wrap items-center gap-2">
            {suggested.map((label) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                onClick={() => setAdding(label)}
              >
                <IconPlus aria-hidden data-icon="inline-start" />
                {label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAdding("")}>
              <IconPlus aria-hidden data-icon="inline-start" />
              {t.add}
            </Button>
          </div>
        ))}
    </section>
  );
}
