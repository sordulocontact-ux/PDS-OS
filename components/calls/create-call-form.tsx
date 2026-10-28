"use client";

import { useState } from "react";

import { CallPlanForm } from "@/components/calls/call-plan-form";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCall } from "@/lib/calls/actions";
import type { CallContact, TeamPerson } from "@/lib/calls/invite";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * "Nouveau call": a button that unfolds the form in place. When the project
 * has no call yet, the form is open from the start (it is the only action).
 * Planned as in Teams (CallPlanForm): name, who takes part, the slot, the
 * Meet link; recording consent is given by contract.
 */
export function CreateCallForm({
  projectId,
  defaultOccurredAt,
  defaultTitle,
  initiallyOpen,
  team,
  contacts,
  googleMeet,
}: {
  projectId: string;
  defaultOccurredAt: string;
  defaultTitle: string;
  initiallyOpen: boolean;
  // Who can be invited in the app (the owner left out): the project's team
  // is proposed, each one notified (UX test of 09/10/2026); the direction
  // and the other creative directors are only offered (Sacha 28/10/2026).
  team: (TeamPerson & { detail: string })[];
  contacts: CallContact[];
  googleMeet: boolean;
}) {
  const t = fr.calls.create;
  const [open, setOpen] = useState(initiallyOpen);
  const canEdit = useCanEditProject();

  if (!canEdit) return null;

  if (!open) {
    return (
      <Button className="h-10 px-4" onClick={() => setOpen(true)}>
        {fr.calls.list.newCall}
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="max-w-xl">
        <CallPlanForm
          action={createCall}
          hidden={{ projectId }}
          defaultTitle={defaultTitle}
          titlePlaceholder={t.titlePlaceholder}
          defaultOccurredAt={defaultOccurredAt}
          members={team}
          memberDetail={fr.calls.schedule.projectMemberDetail}
          defaultMemberIds={team
            .filter((p) => p.place === "owner" || p.place === "team")
            .map((p) => p.personId)}
          contacts={contacts}
          participantsHint={fr.calls.schedule.participantsProjectHint}
          googleMeet={googleMeet}
          submitLabel={t.submit}
          pendingLabel={t.pending}
          cancelLabel={t.cancel}
          onCancel={initiallyOpen ? undefined : () => setOpen(false)}
          footer="start"
        />
      </CardContent>
    </Card>
  );
}
