"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Member } from "@/lib/framing/related";
import { writtenOf } from "@/lib/framing/written";
import { fr } from "@/lib/i18n/fr";
import { applyRecommendation } from "@/lib/strategy/actions/follow-up";
import type { Recommendation } from "@/lib/strategy/recommendations";

type Errors = Partial<Record<"title" | "assignee" | "due", string>>;

/**
 * « Créer la tâche » (MKT-C2-02): everything the code knows is prefilled —
 * the action proposed, the deliverable's assignee (else the project's
 * owner), the due date with its basis — and corrected by the owner. The
 * recommendation stays shown as context; the task links back to it.
 */
export function RecommendationTaskForm({
  projectId,
  recommendation,
  members,
  ownerId,
  today,
  basis,
  onDone,
}: {
  projectId: string;
  recommendation: Recommendation;
  members: Member[];
  ownerId: string | null;
  today: string;
  // Why the proposed date, as the card says it.
  basis: string;
  onDone: () => void;
}) {
  const t = fr.strategyFollowUp.recommendations.task;
  const [errors, setErrors] = useState<Errors>({});
  const { pending, error, run } = useWriteSubmit(onDone, t.created);
  const proposed = recommendation.task;
  const assignee =
    members.find((m) => m.personId === proposed.assigneeId)?.personId ??
    ownerId ??
    "";

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const title = String(form.get("title") ?? "").trim();
        const assigneeId = String(form.get("assignee") ?? "");
        const dueOn = String(form.get("due") ?? "");
        const found: Errors = {};
        if (!title) found.title = t.nameRequired;
        if (!assigneeId) found.assignee = t.assigneeRequired;
        if (!dueOn) found.due = t.dueRequired;
        else if (dueOn < today) found.due = t.duePast;
        setErrors(found);
        const first = Object.keys(found)[0];
        if (first) {
          event.currentTarget
            .querySelector<HTMLElement>(`[name="${first}"]`)
            ?.focus();
          return;
        }
        run(() =>
          writtenOf(
            applyRecommendation({
              projectId,
              ruleKey: recommendation.ruleKey,
              title,
              assigneeId,
              dueOn,
            }),
          ),
        );
      }}
    >
      <div className="flex flex-col gap-1 rounded-2xl bg-muted p-4">
        <p className="text-caption text-muted-foreground">{t.context}</p>
        <p className="text-body-md">{recommendation.text}</p>
      </div>
      <Field
        id="reco-task-title"
        name="title"
        label={t.name}
        required
        maxLength={300}
        defaultValue={recommendation.action}
        error={errors.title}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionSelect
          id="reco-task-assignee"
          name="assignee"
          label={t.assignee}
          required
          items={Object.fromEntries(members.map((m) => [m.personId, m.name]))}
          defaultValue={assignee || null}
          error={errors.assignee}
        />
        <Field
          id="reco-task-due"
          name="due"
          label={t.due}
          type="date"
          required
          min={today}
          defaultValue={proposed.dueOn}
          hint={t.dueHint(basis)}
          error={errors.due}
        />
      </div>
      {Object.keys(errors).length > 0 && (
        <FormMessage kind="error">
          {t.missing(Object.keys(errors).length)}
        </FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
