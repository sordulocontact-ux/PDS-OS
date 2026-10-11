"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ChipChoice } from "@/components/ui/chip-choice";
import { ToneCallout } from "@/components/ui/tone-callout";
import { PRIORITIES, type Priority } from "@/lib/activations/model";
import { addTarget, targetWarnings } from "@/lib/activations/target-actions";
import type { TargetWarning } from "@/lib/activations/targets";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listNetworkForRole } from "@/lib/network/role-people-actions";
import type { RankedPerson } from "@/lib/network/ranked-people";

const t = fr.activationWork.targets;

const warningText = (w: TargetWarning) =>
  w.key === "proposed"
    ? t.warningLabels.proposed(w.count)
    : t.warningLabels[w.key];

/**
 * Adds an influencer (Influence) or a media and its journalist (RP) from the
 * Réseau — created there on the spot when missing, never as a second card.
 * The profile's alerts show once picked and must be confirmed ; the
 * collaboration or target opens afterwards (the existing one on a repeat).
 */
export function AddTargetForm({
  projectId,
  activationId,
  press,
  onDone,
}: {
  projectId: string;
  activationId: string;
  press: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [contactId, setContactId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<TargetWarning[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [priority, setPriority] = useState<Priority>("normal");
  const [error, setError] = useState<string | null>(null);
  const loadContacts = usePickerLoad(() =>
    listNetworkForRole(press ? ["media"] : ["influencer"]),
  );
  const loadJournalists = usePickerLoad(() =>
    listNetworkForRole(["journalist"]),
  );

  function pick(option: RankedPerson | null) {
    setContactId(option?.id ?? null);
    setWarnings([]);
    setConfirmed(false);
    if (option)
      targetWarnings({
        contactId: option.id,
        activationId,
        withAudience: !press,
      }).then(setWarnings);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!contactId) return setError(fr.activationWork.errors.contactRequired);
    if (warnings.length > 0 && !confirmed) return setError(t.confirmRequired);
    setError(null);
    startTransition(async () => {
      const result = await addTarget({
        projectId,
        activationId,
        contactId,
        journalistId: String(data.get("journalistId") ?? "") || null,
        priority,
        angle: String(data.get("angle") ?? ""),
        justification: String(data.get("justification") ?? ""),
        confirmedWarnings: warnings.map((w) => w.key),
      });
      if (!result.ok) return setError(result.error);
      toast.success(result.existed ? t.exists : t.added);
      onDone();
      router.push(
        routes.projectActivationTarget(
          projectId,
          activationId,
          result.targetId,
        ),
      );
    });
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <PersonPickerField<RankedPerson>
        refName="contactId"
        nameName="contactName"
        legend={t.contact}
        load={loadContacts}
        defaultRef={null}
        defaultName={null}
        createRoles={press ? ["media"] : ["influencer"]}
        createKind={press ? "organization" : "person"}
        refOfContact={(id) => id}
        allowNameOnly={false}
        suggest={(o) => o.group !== "network"}
        required
        onPick={pick}
      />
      {warnings.length > 0 && (
        <ToneCallout tone="warning">
          <p className="font-medium">{t.warnings}</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w) => (
              <li key={w.key}>{warningText(w)}</li>
            ))}
          </ul>
        </ToneCallout>
      )}
      {warnings.length > 0 && (
        <CheckboxField
          label={t.confirmWarnings}
          checked={confirmed}
          onChange={setConfirmed}
        />
      )}
      {press && (
        <PersonPickerField<RankedPerson>
          refName="journalistId"
          nameName="journalistName"
          legend={t.journalist}
          load={loadJournalists}
          defaultRef={null}
          defaultName={null}
          createRoles={["journalist"]}
          refOfContact={(id) => id}
          allowNameOnly={false}
          suggest={(o) => o.group !== "network"}
        />
      )}
      <ChipChoice
        name="priority"
        legend={t.priority}
        value={priority}
        onChange={(v) => setPriority(v ?? "normal")}
        options={PRIORITIES.map((p) => ({
          value: p,
          label: fr.activations.priorities[p],
        }))}
      />
      <TextareaField name="angle" label={t.angle} rows={2} maxLength={2000} />
      <TextareaField
        name="justification"
        label={t.justification}
        rows={2}
        maxLength={2000}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.add}
        </Button>
      </div>
    </form>
  );
}
