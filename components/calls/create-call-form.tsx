"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { CallPlanForm } from "@/components/calls/call-plan-form";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogButton } from "@/components/ui/dialog-button";
import { createCall } from "@/lib/calls/actions";
import type { CallContact, TeamPerson } from "@/lib/calls/invite";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

type Props = {
  projectId: string;
  defaultOccurredAt: string;
  defaultTitle: string;
  // Who can be invited in the app (the owner left out): the project's team
  // is proposed, each one notified (UX test of 09/10/2026); the direction
  // and the other creative directors are only offered (Sacha 28/10/2026).
  team: (TeamPerson & { detail: string })[];
  contacts: CallContact[];
  googleMeet: boolean;
  // The button's weight when it sits beside another action (outline then).
  variant?: "default" | "outline";
};

/**
 * "Nouveau call" of a project, for its owner only. In the head of the
 * project's Calls (on the title's line), a button opening the form in the
 * modal, like « Nouvelle réunion » in Calls; `initiallyOpen` (no call yet:
 * it is the page's only action) shows the form in place. Planned as in
 * Teams (CallPlanForm): name, who takes part, the slot, the Meet link;
 * recording consent is given by contract. Created, the call opens.
 */
export function CreateCallForm({
  initiallyOpen,
  variant = "default",
  ...props
}: Props & { initiallyOpen: boolean }) {
  const t = fr.calls.create;
  const canEdit = useCanEditProject();
  if (!canEdit) return null;

  if (!initiallyOpen)
    return (
      <DialogButton
        label={fr.calls.list.newCall}
        icon={IconPlus}
        variant={variant}
        size="lg"
        title={t.title}
        description={t.description}
        wide
      >
        {(close) => <ProjectCallFields {...props} onCancel={close} />}
      </DialogButton>
    );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="max-w-xl">
        <ProjectCallFields {...props} />
      </CardContent>
    </Card>
  );
}

function ProjectCallFields({
  projectId,
  defaultOccurredAt,
  defaultTitle,
  team,
  contacts,
  googleMeet,
  onCancel,
}: Props & { onCancel?: () => void }) {
  const t = fr.calls.create;
  return (
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
      onCancel={onCancel}
      footer={onCancel ? undefined : "start"}
    />
  );
}
