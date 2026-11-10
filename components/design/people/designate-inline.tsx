"use client";

import { FieldError } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { designateDesignResponsible } from "@/lib/design/actions/home";
import type { Member } from "@/lib/framing/related";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { designSteps };

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
  // Per member: the toast and the result banner (« Nadia Benali désigné
  // responsable… »), written on the server.
  done: Record<string, string>;
}) {
  const { pending, error, run } = useWriteSubmit(() => undefined, "");
  return (
    <form
      className="flex flex-col gap-1.5"
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
            done: done[personId] ?? "",
          }),
        );
      }}
    >
      {/* The hint sits under the row, not inside the select's column, so
          « Désigner » lines up with the select itself. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <OptionSelect
          className="min-w-0 flex-1 gap-3"
          name={name}
          label={label}
          required
          items={Object.fromEntries(
            members.filter((m) => m.name).map((m) => [m.personId, m.name]),
          )}
          defaultValue={suggestion?.personId ?? members[0]?.personId ?? null}
        />
        <Button
          type="submit"
          variant="outline"
          className="h-10"
          disabled={pending}
          aria-busy={pending}
        >
          {fr.designSteps.home.creative.designate}
        </Button>
      </div>
      {error ? (
        <FieldError id={`${name}-error`}>{error}</FieldError>
      ) : (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </form>
  );
}
