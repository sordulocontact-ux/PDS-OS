"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { StepSection } from "@/components/shell/journey/step-section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { strategyBriefOut } from "@/lib/i18n/fr/strategy-brief-out";
import { sendBriefOut } from "@/lib/strategy/actions/brief-out";

const fr = { strategyBriefOut };

const t = fr.strategyBriefOut.send;

type Person = { personId: string; name: string };

/**
 * « Envoyer en validation » in the step (proto stask): the direction
 * validates always (ticked, fixed), the project's creative directors are
 * ticked by default; the server writes the version and sends it.
 */
export function SendBrief({
  projectId,
  director,
  creatives,
}: {
  projectId: string;
  director: Person | null;
  creatives: Person[];
}) {
  const [picked, setPicked] = useState(
    () => new Set(creatives.map((c) => c.personId)),
  );
  const { pending, error, run } = useWriteSubmit(() => undefined, t.done);
  return (
    <StepSection title={t.title}>
      <div className="flex flex-col gap-3">
        {director ? (
          <label className="flex items-start gap-3">
            <Checkbox size="md" className="mt-0.5" checked disabled readOnly />
            <span className="text-sm font-medium">
              {director.name}{" "}
              <span className="text-muted-foreground">· {t.always}</span>
            </span>
          </label>
        ) : (
          <FormMessage kind="error">{t.noValidator}</FormMessage>
        )}
        {creatives.map((c) => (
          <CheckboxField
            key={c.personId}
            label={`${c.name} · ${t.creative}`}
            checked={picked.has(c.personId)}
            onChange={(on) =>
              setPicked((all) => {
                const next = new Set(all);
                if (on) next.add(c.personId);
                else next.delete(c.personId);
                return next;
              })
            }
          />
        ))}
        <FormMessage kind="error">{error}</FormMessage>
        <div>
          <Button
            type="button"
            disabled={pending || !director}
            aria-busy={pending || undefined}
            onClick={() => run(() => sendBriefOut(projectId, [...picked], ""))}
          >
            {t.button}
          </Button>
        </div>
      </div>
    </StepSection>
  );
}
