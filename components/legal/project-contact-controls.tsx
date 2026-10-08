"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { PersonPickerField } from "@/components/network/person-picker-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  addLegalProjectContact,
  listLegalContactOptions,
  removeLegalProjectContact,
  type LegalContactOption,
} from "@/lib/legal/project-contacts/actions";

/**
 * Adds a person of the Réseau to the legal file (a lawyer, a distributor,
 * a photographer…): picked or added to the Réseau on the spot, never a name
 * alone; their role pre-filled from their roles in the Réseau, correctable.
 */
export function AddProjectContactForm({ projectId }: { projectId: string }) {
  const t = fr.legal.projectContacts;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState("other");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    // A contact created from the picker submits its own form (in a modal),
    // which bubbles here through the portal: not this form's submit.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const contactId = String(data.get("contactId") ?? "");
    if (!contactId) {
      setError(t.contactRequired);
      form.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addLegalProjectContact({
        projectId,
        contactId,
        role: String(data.get("role") ?? role),
      });
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-3"
      onSubmit={submit}
    >
      <PersonPickerField<LegalContactOption>
        refName="contactId"
        nameName="contactName"
        legend={t.contact}
        load={() => listLegalContactOptions(projectId)}
        defaultRef={null}
        defaultName={null}
        createRoles={[]}
        refOfContact={(id) => id}
        allowNameOnly={false}
        required
        onPick={(option) => option && setRole(option.role)}
        error={error ?? undefined}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <OptionSelect
          // Remounted on each suggestion: the picked person's role shows.
          key={role}
          name="role"
          label={t.role}
          items={fr.legalForms.roles}
          defaultValue={role}
          onValueChange={setRole}
          required
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.pending : t.submit}
        </Button>
      </div>
    </form>
  );
}

/** « Retirer » a person from the legal file (refused while a contract is
 * mapped for them, said in a toast). Adding them again undoes it. */
export function RemoveProjectContactButton({
  projectId,
  rowId,
  name,
}: {
  projectId: string;
  rowId: string;
  name: string;
}) {
  const t = fr.legal.projectContacts;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="xs"
      variant="ghost"
      disabled={pending}
      aria-label={t.remove(name)}
      onClick={() =>
        startTransition(async () => {
          const result = await removeLegalProjectContact(projectId, rowId);
          if (!result.ok) toast.error(result.error);
          else router.refresh();
        })
      }
    >
      {t.removeShort}
    </Button>
  );
}
