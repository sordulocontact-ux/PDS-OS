"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  createNextTask,
  markNotApplicable,
} from "@/lib/activations/journey-actions";
import { fr } from "@/lib/i18n/fr";
import { lowerFirst } from "@/lib/ui/journey";

const t = fr.activationJourney.now;

/**
 * Around the next action (proto, foot of « Maintenant »): make it a task in
 * Travail for its person, or say it does not apply (proof, statistics),
 * with why. Never automatic.
 */
export function NowTools({
  projectId,
  activationId,
  rule,
  todo,
  person,
  dueOn,
  skip,
  taskCreated,
}: {
  projectId: string;
  activationId: string;
  rule: string;
  todo: string;
  person: { personId: string | null; name: string };
  dueOn: string | null;
  skip: "proof" | "stats" | null;
  taskCreated: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => {
    setAsking(false);
    router.refresh();
  }, "");
  const ids = { projectId, activationId };
  if (asking && skip)
    return (
      <form
        noValidate
        className="flex flex-col gap-3 rounded-xl bg-card p-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          const reason = String(
            new FormData(event.currentTarget).get("why") ?? "",
          ).trim();
          setMissing(!reason);
          if (reason) run(() => markNotApplicable({ ...ids, skip, reason }));
        }}
      >
        <Field
          name="why"
          label={t.whyLabel(lowerFirst(todo))}
          placeholder={t.whyPlaceholder}
          required
          error={missing ? fr.activationJourney.errors.why : undefined}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {t.mark}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAsking(false)}
          >
            {t.cancel}
          </Button>
        </div>
        {error && <FormMessage kind="error">{error}</FormMessage>}
      </form>
    );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        <span className="font-semibold">{t.nextOf(person.name)}</span>
        {taskCreated ? (
          <span>{t.taskDone}</span>
        ) : (
          person.personId && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    createNextTask({
                      ...ids,
                      rule,
                      label: todo,
                      assigneePersonId: person.personId ?? "",
                      dueOn,
                    }),
                  fr.activationJourney.done.task,
                )
              }
            >
              {t.task}
            </Button>
          )
        )}
        {skip && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAsking(true)}
          >
            {t.notApplicable}
          </Button>
        )}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
