"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { AudienceForm } from "@/components/strategy/audience-form";
import { StrategyPart } from "@/components/strategy/strategy-part";
import { Button } from "@/components/ui/button";
import { Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { removeAudience } from "@/lib/strategy/actions/audiences";
import type { StrategyAudience } from "@/lib/strategy/queries";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";

const fr = { strategyPilot };

/**
 * The publics, one row each (MKT-S1-05): segment, priority, need or
 * insight, channel foreseen; what is missing is said on the row. The
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

  const row = "flex flex-col gap-1.5 px-3.5 modern:px-3 py-3";
  const label = "text-[color:var(--text-secondary)]";
  const toFill = (
    <span className="text-[color:var(--text-tertiary)]">{t.toFill}</span>
  );

  return (
    <StrategyPart id="audiences-title" title={t.title}>
      {audiences.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}
      {(audiences.length > 0 || adding !== null) && (
        <Rows label={t.title}>
          {audiences.map((a) =>
            editing === a.id ? (
              <li
                key={a.id}
                id={`audience-${a.id}`}
                className="p-3.5 modern:p-4"
              >
                <AudienceForm
                  projectId={projectId}
                  audience={a}
                  onDone={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={a.id} id={`audience-${a.id}`} className={row}>
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
                    // « Modifier » outlined, « Retirer » in text beside it.
                    <span className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setEditing(a.id)}
                      >
                        {t.edit}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          run(() => removeAudience(projectId, a.id))
                        }
                      >
                        {t.remove}
                      </Button>
                    </span>
                  )}
                </div>
                <p className="text-sm">
                  <span className={label}>{t.insight} : </span>
                  {a.insight ?? toFill}
                </p>
                <p className="text-sm">
                  <span className={label}>{t.channel} : </span>
                  {a.channel ?? toFill}
                </p>
              </li>
            ),
          )}
          {canEdit && adding !== null && (
            <li id="audience-new" className="p-3.5 modern:p-4">
              <AudienceForm
                projectId={projectId}
                audience={null}
                defaultSegment={adding}
                onDone={() => setAdding(null)}
              />
            </li>
          )}
        </Rows>
      )}
      {canEdit && adding === null && (
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
      )}
    </StrategyPart>
  );
}
