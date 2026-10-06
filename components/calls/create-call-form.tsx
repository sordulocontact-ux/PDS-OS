"use client";

import { useActionState, useState } from "react";

import { CallFields, withOccurredAt } from "@/components/calls/call-fields";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCall } from "@/lib/calls/actions";
import { fr } from "@/lib/i18n/fr";

/**
 * "Nouveau call": a button that unfolds the form in place. When the project
 * has no call yet, the form is open from the start (it is the only action).
 * A title, a date and an optional video link: recording consent is given by
 * contract.
 */
export function CreateCallForm({
  projectId,
  defaultOccurredAt,
  defaultTitle,
  initiallyOpen,
}: {
  projectId: string;
  defaultOccurredAt: string;
  defaultTitle: string;
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

  const submit = (form: FormData) => formAction(withOccurredAt(form));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submit} className="grid max-w-xl gap-5">
          <input type="hidden" name="projectId" value={projectId} />
          <CallFields
            defaultTitle={defaultTitle}
            defaultOccurredAt={defaultOccurredAt}
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
