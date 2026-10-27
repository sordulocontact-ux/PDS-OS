"use client";

import { useRef, useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import {
  ReadyPlanFields,
  type PlanDraft,
} from "@/components/production/readiness/ready-plan-fields";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Member } from "@/lib/framing/related";
import { productionReady } from "@/lib/i18n/fr/production-ready";
import { confirmReady } from "@/lib/production/ready-actions";

const fr = { productionReady };

const t = fr.productionReady;

/**
 * « Confirmer : préparation validée » (proto BODY.ready): when lines are
 * not ready, the callout, « Je confirme la préparation malgré … » and the
 * reason; a critical line not ready adds the catch-up plan and makes it a
 * request to the direction (recette 23/10, MKT-PROD-002). The server
 * computes the synthesis again before keeping it.
 */
export function ReadyConfirmForm({
  projectId,
  deliverableId,
  missing,
  members,
  decider,
  today,
}: {
  projectId: string;
  deliverableId: string;
  // The lines not ready, with their severity.
  missing: { key: string; label: string; critical: boolean }[];
  members: Member[];
  // Who decides a derogation, as named on screen.
  decider: string;
  today: string;
}) {
  const root = useRef<HTMLFormElement>(null);
  const [forced, setForced] = useState(false);
  const [plan, setPlan] = useState<PlanDraft>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, error, run } = useWriteSubmit(() => undefined, t.confirm);
  const critical = missing.filter((m) => m.critical);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    ).trim();
    const next: Record<string, string> = {};
    if (missing.length > 0 && !forced) next.force = t.errors.force;
    if (missing.length > 0 && !reason) next.reason = t.errors.reason;
    for (const c of critical) {
      const line = plan[c.key];
      if (!line?.who) next[`who-${c.key}`] = t.errors.planWho;
      if (!line?.due) next[`due-${c.key}`] = t.errors.planDue;
      else if (line.due < today) next[`due-${c.key}`] = t.errors.planPast;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    run(() =>
      confirmReady({
        projectId,
        deliverableId,
        reason,
        plan: critical.map((c) => ({
          key: c.key,
          personId: plan[c.key].who.replace(/^person:/, ""),
          dueOn: plan[c.key].due,
        })),
      }),
    );
  }

  const count = Object.keys(errors).length;
  return (
    <form
      ref={root}
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4"
    >
      {missing.length > 0 && (
        <>
          <ToneCallout tone="warning">
            {critical.length > 0
              ? t.missingCritical(critical.length, decider)
              : t.missing(missing.length)}
          </ToneCallout>
          <CheckboxField
            label={t.force(
              missing.map((m) => m.label.toLowerCase()).join(", "),
            )}
            checked={forced}
            onChange={setForced}
          />
          {errors.force && (
            <FormMessage kind="error">{errors.force}</FormMessage>
          )}
          <TextareaField
            name="reason"
            label={t.reason}
            placeholder={t.reasonPlaceholder}
            required
            rows={2}
            maxLength={1000}
            error={errors.reason}
          />
          {critical.length > 0 && (
            <ReadyPlanFields
              lines={critical}
              members={members}
              draft={plan}
              today={today}
              errors={errors}
              onChange={(key, value) =>
                setPlan((p) => ({ ...p, [key]: value }))
              }
            />
          )}
        </>
      )}
      {count > 0 && (
        <FormMessage kind="error">{t.errors.count(count)}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {critical.length > 0 ? t.ask : t.confirm}
        </Button>
      </div>
    </form>
  );
}
