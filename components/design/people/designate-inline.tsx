"use client";

import { FieldError } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { designateDesignResponsible } from "@/lib/design/actions/home";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

/**
 * « Qui prépare la direction artistique * » / « Responsable de la fiche * »
 * in place (proto crset / frset): the members of the organization, the
 * code's suggestion pre-selected and said under the list — « Rien n'est
 * affecté sans vous » — then « Désigner ». Only an account acts, so only
 * members are listed (CLAUDE.md « Formulaires », exception of the app's
 * accounts).
 */
export function DesignateInline({
  projectId,
  scope,
  sheetId,
  name,
  label,
  members,
  suggestion,
  hint,
  done,
}: {
  projectId: string;
  scope: "direction" | "sheet";
  sheetId: string | null;
  name: string;
  label: string;
  members: Member[];
  suggestion: Member | null;
  hint: string;
  // The toast and the result banner (« Nadia Benali désigné responsable… »).
  done: (person: string) => string;
}) {
  const { pending, error, run } = useWriteSubmit(() => undefined, "");
  return (
    <form
      className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const personId = String(new FormData(e.currentTarget).get(name) ?? "");
        const person = members.find((m) => m.personId === personId);
        if (!person) return;
        run(() =>
          designateDesignResponsible({
            projectId,
            scope,
            sheetId,
            personId,
            done: done(person.name),
          }),
        );
      }}
    >
      <div className="flex flex-col gap-1">
        <OptionSelect
          name={name}
          label={label}
          required
          items={Object.fromEntries(
            members.filter((m) => m.name).map((m) => [m.personId, m.name]),
          )}
          defaultValue={suggestion?.personId ?? members[0]?.personId ?? null}
          hint={hint}
        />
        <FieldError id={`${name}-error`}>{error ?? undefined}</FieldError>
      </div>
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        aria-busy={pending}
      >
        {fr.designSteps.home.creative.designate}
      </Button>
    </form>
  );
}
