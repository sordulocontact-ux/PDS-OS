"use client";

import { useState } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { useDialogSubmit } from "@/components/ui/use-dialog-submit";
import { fr } from "@/lib/i18n/fr";
import { resolveShootIncident } from "@/lib/production/shoot/incident-actions";

import { ShootFormActions } from "./shoot-form-actions";

const t = fr.productionShoot.incidents;

/** « Résoudre »: what was done; who and when are stamped by the database. */
export function IncidentResolveForm({
  projectId,
  incidentId,
  onDone,
}: {
  projectId: string;
  incidentId: string;
  onDone: () => void;
}) {
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useDialogSubmit(onDone, t.resolvedDone);
  const id = `incident-${incidentId}-resolution`;

  function submit(form: HTMLFormElement) {
    const resolution = String(
      new FormData(form).get("resolution") ?? "",
    ).trim();
    setMissing(resolution === "");
    if (resolution === "") {
      form.querySelector<HTMLElement>(`#${id}`)?.focus();
      return;
    }
    run(() => resolveShootIncident({ projectId, incidentId, resolution }));
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <TextareaField
        id={id}
        name="resolution"
        label={t.fields.resolution}
        aria-required
        rows={3}
        maxLength={2000}
        placeholder={t.fields.resolutionPlaceholder}
        error={missing ? t.missingResolution : undefined}
      />
      <ShootFormActions
        pending={pending}
        error={error}
        submitLabel={t.resolveAction}
        onCancel={onDone}
      />
    </form>
  );
}
