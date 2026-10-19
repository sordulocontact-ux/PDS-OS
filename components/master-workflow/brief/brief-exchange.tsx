"use client";

import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";
import { startBrief } from "@/lib/master-workflow/brief-fact-actions";

/**
 * « Préparer un échange » in the step (proto `mxPrep`): the common call
 * form, staying on the Brief, with « Commencer directement plutôt ».
 */
export function BriefExchange({
  projectId,
  defaults,
}: {
  projectId: string;
  defaults: CallPrepDefaults;
}) {
  const submit = useWriteSubmit(() => undefined, fr.masterBrief.start.started);
  return (
    <CallPrepForm
      defaults={defaults}
      stay
      onStartDirectly={() => submit.run(() => startBrief(projectId, "direct"))}
    />
  );
}
