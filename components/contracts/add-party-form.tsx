"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { Button } from "@/components/ui/button";
import { addContractParty } from "@/lib/contracts/actions";
import {
  listContractPartyOptions,
  type ContractPartyOption,
} from "@/lib/contracts/party-options";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/**
 * Adds a party to a contract: a contact of the Réseau, picked (the
 * contract's artist and the people credited on its project first) or added
 * to the Réseau on the spot, and its role, filled from what PDS OS knows of
 * that contact. A name alone is refused: a party is a contact.
 */
export function AddPartyForm({ contractId }: { contractId: string }) {
  const t = fr.contracts.parties;
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState("");
  // The role last filled from a contact: replaced when another is picked.
  const [suggested, setSuggested] = useState("");
  const [error, setError] = useState<string | null>(null);

  function pick(option: ContractPartyOption | null) {
    if (!option) return;
    setError(null);
    if (!role.trim() || role === suggested) setRole(option.role);
    setSuggested(option.role);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    // A contact added from the picker submits its own form (in a modal),
    // which bubbles here through the portal: not this form's submit.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const form = event.currentTarget;
    const contactId = String(new FormData(form).get("contactId") ?? "");
    if (!contactId) {
      setError(t.contactRequired);
      form.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addContractParty({ contractId, contactId, role });
      // On success the parent mounts this form again once the party is listed.
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-3"
      onSubmit={submit}
    >
      <PersonPickerField<ContractPartyOption>
        refName="contactId"
        nameName="contactName"
        legend={t.contact}
        load={() => listContractPartyOptions(contractId)}
        defaultRef={null}
        defaultName={null}
        createRoles={[]}
        refOfContact={(id) => id}
        allowNameOnly={false}
        required
        onPick={pick}
        error={error ?? undefined}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field
          name="role"
          label={t.role}
          maxLength={80}
          autoComplete="off"
          placeholder={t.rolePlaceholder}
          value={role}
          onChange={(event) => setRole(event.target.value)}
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.pending : t.submit}
        </Button>
      </div>
    </form>
  );
}
