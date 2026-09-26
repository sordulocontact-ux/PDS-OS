"use client";

import { useActionState, useState } from "react";

import { ConsentOptions } from "@/components/calls/consent-options";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCall } from "@/lib/calls/actions";
import { fr } from "@/lib/i18n/fr";

/**
 * "Nouveau call": a button that unfolds the form in place. When the project
 * has no call yet, the form is open from the start (it is the only action).
 */
export function CreateCallForm({
  projectId,
  defaultOccurredAt,
  initiallyOpen,
}: {
  projectId: string;
  defaultOccurredAt: string;
  initiallyOpen: boolean;
}) {
  const t = fr.calls.create;
  const [open, setOpen] = useState(initiallyOpen);
  const [state, formAction, pending] = useActionState(createCall, null);
  const canEdit = useCanEditProject();

  if (!canEdit) return null;

  if (!open) {
    return (
      <Button className="h-10 px-4" onClick={() => setOpen(true)}>
        {fr.calls.list.newCall}
      </Button>
    );
  }

  // datetime-local has no zone: convert with the browser's zone before sending.
  const submit = (form: FormData) => {
    const local = String(form.get("occurredAtLocal") ?? "");
    const date = new Date(local);
    form.set(
      "occurredAt",
      Number.isNaN(date.getTime()) ? "" : date.toISOString(),
    );
    formAction(form);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submit} className="grid max-w-xl gap-5">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grid gap-2">
            <Label htmlFor="call-title">{t.fieldTitle}</Label>
            <Input
              id="call-title"
              name="title"
              required
              maxLength={200}
              autoComplete="off"
              placeholder={t.titlePlaceholder}
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="call-date">{t.fieldDate}</Label>
            <Input
              id="call-date"
              name="occurredAtLocal"
              type="datetime-local"
              required
              defaultValue={defaultOccurredAt}
              className="h-10 w-fit"
            />
          </div>
          <ConsentOptions
            defaultValue="pending"
            legend={t.consentLegend}
            hint={t.consentHint}
          />
          {state && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {fr.calls.errors[state.error]}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending} className="h-10 px-4">
              {pending ? t.pending : t.submit}
            </Button>
            {!initiallyOpen && (
              <Button
                type="button"
                variant="ghost"
                className="h-10 px-4"
                onClick={() => setOpen(false)}
              >
                {t.cancel}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
