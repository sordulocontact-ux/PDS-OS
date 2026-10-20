"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { assignRound } from "@/lib/master-workflow/inhouse-actions";

/** « Assigner à Hugo Martin » (proto `master:hugo`): the in-house engineer
 * gets the round in his Travail, no link, no e-mail. */
export function AssignRound({
  projectId,
  stage,
  name,
}: {
  projectId: string;
  stage: "mix" | "mastering";
  name: string;
}) {
  const submit = useWriteSubmit(
    () => undefined,
    fr.masterInHouse.assigned(name),
  );
  return (
    <div className="flex flex-col gap-2">
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <Button
        className="self-start"
        disabled={submit.pending}
        onClick={() => submit.run(() => assignRound(projectId, stage, name))}
      >
        {fr.masterInHouse.assign(name)}
      </Button>
    </div>
  );
}
