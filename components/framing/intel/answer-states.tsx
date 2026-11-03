"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { FieldError } from "@/components/auth/form-message";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  answerLater,
  answerNotApplicable,
} from "@/lib/framing/actions/answers";
import type { QuestionKey } from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingIntel };

type Props = {
  projectId: string;
  questionKey: QuestionKey;
  onCancel: () => void;
  onDone: () => void;
};

function Actions({
  pending,
  label,
  onCancel,
}: {
  pending: boolean;
  label: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" size="sm" disabled={pending}>
        {label}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={onCancel}
      >
        {fr.framingIntel.guide.cancel}
      </Button>
    </div>
  );
}

/** « Non applicable »: an answer, always with its reason (PROJ-UX-04). */
export function NotApplicableForm({
  projectId,
  questionKey,
  onCancel,
  onDone,
}: Props) {
  const t = fr.framingIntel.answerStates;
  const { pending, run } = useFramingAction();
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const error = tried && !reason.trim() ? t.reasonRequired : undefined;
  const id = `na-${questionKey}`;
  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!reason.trim()) return;
        run(() => answerNotApplicable(projectId, questionKey, reason), onDone);
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={id} required>
          {t.naTitle}
        </Label>
        <Textarea
          id={id}
          rows={2}
          maxLength={300}
          value={reason}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <FieldError id={`${id}-error`}>{error}</FieldError>
      </div>
      <Actions pending={pending} label={t.naSave} onCancel={onCancel} />
    </form>
  );
}

/**
 * « À définir plus tard »: answered with a follow-up task for the one who
 * answers, before a chosen date (PROJ-UX-04). The Brief says it is open.
 */
export function LaterForm({ projectId, questionKey, onCancel, onDone }: Props) {
  const t = fr.framingIntel.answerStates;
  const { pending, run } = useFramingAction();
  const [due, setDue] = useState("");
  const [tried, setTried] = useState(false);
  const error = tried && !due ? t.dueRequired : undefined;
  const id = `later-${questionKey}`;
  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!due) return;
        run(
          () =>
            answerLater(
              projectId,
              questionKey,
              due,
              t.task(fr.framingIntel.questions[questionKey].label),
            ),
          () => {
            toast.success(t.laterDone);
            onDone();
          },
        );
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={id} required>
          {t.due}
        </Label>
        <Input
          id={id}
          type="date"
          value={due}
          className="h-10 w-fit min-w-48"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setDue(e.target.value)}
          autoFocus
        />
        <FieldError id={`${id}-error`}>{error}</FieldError>
      </div>
      <Actions pending={pending} label={t.laterSave} onCancel={onCancel} />
    </form>
  );
}
